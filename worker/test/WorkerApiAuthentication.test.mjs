import assert from 'node:assert/strict';
import test from 'node:test';

import {
    WorkerAuthenticationError,
    postJson,
    requiredWorkerAuthToken,
} from '../dist/index.js';

test('requires a non-empty valid worker authentication token', () => {
    for (const value of [undefined, '', '   ', 'token with spaces', 'token:colon']) {
        assert.throws(
            () => requiredWorkerAuthToken({ RELAYFOLD_WORKER_AUTH_TOKEN: value }),
            /RELAYFOLD_WORKER_AUTH_TOKEN/
        );
    }

    assert.equal(
        requiredWorkerAuthToken({ RELAYFOLD_WORKER_AUTH_TOKEN: 'high-entropy_token.123~' }),
        'high-entropy_token.123~'
    );
});

test('attaches the shared bearer token to worker API requests', async () => {
    const originalFetch = globalThis.fetch;
    let request;
    globalThis.fetch = async (url, init) => {
        request = { url, init };
        return new Response('{"status":"accepted"}', {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };

    try {
        await postJson(
            'http://orchestrator:3001/workers/heartbeat',
            { worker_id: 'worker-1' },
            'shared-test-token'
        );
        assert.equal(request.init.headers.authorization, 'Bearer shared-test-token');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('maps unauthorized responses to a fatal authentication error without response details', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('supplied secret was rejected', { status: 401 });

    try {
        await assert.rejects(
            postJson(
                'http://orchestrator:3001/workers/tasks/claim',
                { worker_id: 'worker-1' },
                'wrong-token'
            ),
            (error) => {
                assert(error instanceof WorkerAuthenticationError);
                assert.doesNotMatch(error.message, /wrong-token|supplied secret/);
                return true;
            }
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('preserves HTTP errors for transient server failures', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('temporarily unavailable', { status: 503 });

    try {
        await assert.rejects(
            postJson(
                'http://orchestrator:3001/workers/register',
                {},
                'shared-test-token'
            ),
            (error) => error.status === 503
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});
