import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    cleanupExpiredWorkspaces,
    deleteWorkspace,
    materializeTaskWorkspace,
    materializeWorkspacePath,
    resolveWorkspacePath,
} from '../dist/core/WorkspaceManager.js';

test('materializes dispatched workspace suffix under worker root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'runhelm-worker-workspace-'));

    const payload = await materializeTaskWorkspace(
        {
            namespace: '550e8400-e29b-41d4-a716-446655440000',
            workflow_inst_id: 'workflow-1',
            task: {
                id: 'draft',
                kind: { Function: { code: 'return {};', dependencies: [] } },
                required_credentials: [],
            },
            workspace_path_suffix: '550e8400-e29b-41d4-a716-446655440000/workflow-1/taskid-draft',
            inputs: [],
        },
        root
    );

    const expectedWorkspacePath = path.join(
        root,
        '550e8400-e29b-41d4-a716-446655440000',
        'workflow-1',
        'taskid-draft'
    );
    assert.equal(payload.workspace_path, expectedWorkspacePath);
    assert.equal((await stat(expectedWorkspacePath)).isDirectory(), true);

    const timestamp = await readFile(path.join(expectedWorkspacePath, '.timestamp'), 'utf8');
    assert.match(timestamp, /^\d+$/);
});

test('isolates identical workflow and task workspaces by namespace', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'runhelm-worker-workspace-'));
    const suffixes = [
        '550e8400-e29b-41d4-a716-446655440000/workflow-1/taskid-draft',
        '550e8400-e29b-41d4-a716-446655440001/workflow-1/taskid-draft',
    ];

    const paths = await Promise.all(
        suffixes.map(async (workspace_path_suffix, index) => {
            const payload = await materializeTaskWorkspace(
                {
                    namespace: `550e8400-e29b-41d4-a716-44665544000${index}`,
                    workflow_inst_id: 'workflow-1',
                    task: {
                        id: 'draft',
                        kind: { Function: { code: 'return {};', dependencies: [] } },
                        required_credentials: [],
                    },
                    workspace_path_suffix,
                    inputs: [],
                },
                root
            );
            return payload.workspace_path;
        })
    );

    assert.notEqual(paths[0], paths[1]);
    await Promise.all(paths.map(assertDirectoryExists));
});

test('rejects workspace suffix that escapes worker root', () => {
    assert.throws(
        () => resolveWorkspacePath('/tmp/runhelm-workspaces', '../outside'),
        /workspace_path_suffix must stay under the worker workspace root/
    );
});

test('rejects absolute workspace suffix', () => {
    assert.throws(
        () => resolveWorkspacePath('/tmp/runhelm-workspaces', '/tmp/outside'),
        /workspace_path_suffix must be a non-empty relative path/
    );
});

test('ttl cleanup retains expired active workflow workspaces', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'runhelm-worker-workspace-'));
    await createWorkspace(root, namespacedSuffix('pending-workflow/taskid-draft'), 100);
    await createWorkspace(root, namespacedSuffix('running-workflow/taskid-draft'), 100);
    await createWorkspace(root, namespacedSuffix('input-workflow/taskid-draft'), 100);

    const result = await cleanupExpiredWorkspaces(root, {
        ttlSeconds: 10,
        nowEpochSeconds: 200,
        workflowStatuses: {
            [namespacedWorkflow('pending-workflow')]: 'Pending',
            [namespacedWorkflow('running-workflow')]: 'Running',
            [namespacedWorkflow('input-workflow')]: 'InputNeeded',
        },
    });

    assert.deepEqual(result, { removed: 0, skipped: 3 });
    await assertDirectoryExists(path.join(root, namespacedSuffix('pending-workflow/taskid-draft')));
    await assertDirectoryExists(path.join(root, namespacedSuffix('running-workflow/taskid-draft')));
    await assertDirectoryExists(path.join(root, namespacedSuffix('input-workflow/taskid-draft')));
});

test('ttl cleanup removes only expired terminal workflow workspaces', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'runhelm-worker-workspace-'));
    await createWorkspace(root, namespacedSuffix('completed-workflow/taskid-old'), 100);
    await createWorkspace(root, namespacedSuffix('failed-workflow/taskid-old'), 100);
    await createWorkspace(root, namespacedSuffix('completed-workflow/taskid-fresh'), 195);

    const result = await cleanupExpiredWorkspaces(root, {
        ttlSeconds: 10,
        nowEpochSeconds: 200,
        workflowStatuses: {
            [namespacedWorkflow('completed-workflow')]: 'Completed',
            [namespacedWorkflow('failed-workflow')]: 'Failed',
        },
    });

    assert.deepEqual(result, { removed: 2, skipped: 1 });
    await assertDirectoryMissing(path.join(root, namespacedSuffix('completed-workflow/taskid-old')));
    await assertDirectoryMissing(path.join(root, namespacedSuffix('failed-workflow/taskid-old')));
    await assertDirectoryExists(path.join(root, namespacedSuffix('completed-workflow/taskid-fresh')));
});

test('ttl cleanup retains paused and unknown workflow workspaces', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'runhelm-worker-workspace-'));
    await createWorkspace(root, namespacedSuffix('paused-workflow/taskid-draft'), 100);
    await createWorkspace(root, namespacedSuffix('unknown-workflow/taskid-draft'), 100);

    const result = await cleanupExpiredWorkspaces(root, {
        ttlSeconds: 10,
        nowEpochSeconds: 200,
        workflowStatuses: {
            [namespacedWorkflow('paused-workflow')]: 'Paused',
        },
    });

    assert.deepEqual(result, { removed: 0, skipped: 2 });
    await assertDirectoryExists(path.join(root, namespacedSuffix('paused-workflow/taskid-draft')));
    await assertDirectoryExists(path.join(root, namespacedSuffix('unknown-workflow/taskid-draft')));
});

test('explicit workspace deletion removes a validated workspace regardless of workflow status', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'runhelm-worker-workspace-'));
    const suffix = namespacedSuffix('running-workflow/taskid-draft');
    const workspacePath = await createWorkspace(root, suffix, 100);

    await deleteWorkspace(root, suffix);

    await assertDirectoryMissing(workspacePath);
});

async function createWorkspace(root, suffix, timestamp) {
    const workspacePath = await materializeWorkspacePath(resolveWorkspacePath(root, suffix));
    await writeFile(path.join(workspacePath, '.timestamp'), String(timestamp));
    return workspacePath;
}

function namespacedWorkflow(workflowId) {
    return `550e8400-e29b-41d4-a716-446655440000/${workflowId}`;
}

function namespacedSuffix(suffix) {
    return `550e8400-e29b-41d4-a716-446655440000/${suffix}`;
}

async function assertDirectoryExists(directoryPath) {
    assert.equal((await stat(directoryPath)).isDirectory(), true);
}

async function assertDirectoryMissing(directoryPath) {
    await assert.rejects(() => stat(directoryPath), /ENOENT/);
}
