import assert from 'node:assert/strict';
import test from 'node:test';
import {
    selectAgentTools,
    selectApprovedTools,
} from '../dist/adapters/executors/agent_tools/toolSelection.js';

const availableTools = [
    tool('fetch_url'),
    tool('extension_tool'),
];

test('selects no tools for an empty allowlist', () => {
    const result = selectApprovedTools(availableTools, []);

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), []);
    assert.deepEqual(result.unavailableApprovedToolNames, []);
});

test('selects all available tools for _all_', () => {
    const result = selectApprovedTools(availableTools, ['_all_']);

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), ['fetch_url', 'extension_tool']);
    assert.deepEqual(result.unavailableApprovedToolNames, []);
});

test('selects explicit built-in and extension tools by name', () => {
    const result = selectApprovedTools(availableTools, ['extension_tool']);

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), ['extension_tool']);
    assert.deepEqual(result.unavailableApprovedToolNames, []);
});

test('reports requested tool names that are not available', () => {
    const result = selectApprovedTools(availableTools, ['extension_tool', 'missing_tool']);

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), ['extension_tool']);
    assert.deepEqual(result.unavailableApprovedToolNames, ['missing_tool']);
});

test('adds ask_user when ask is enabled without a tool-list entry', () => {
    const result = selectAgentTools(availableTools, [], tool('ask_user'));

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), ['ask_user']);
    assert.deepEqual(result.unavailableApprovedToolNames, []);
});

test('silently ignores an ask_user entry when ask is disabled', () => {
    const result = selectAgentTools(
        [...availableTools, tool('ask_user')],
        ['extension_tool', 'ask_user'],
    );

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), ['extension_tool']);
    assert.deepEqual(result.unavailableApprovedToolNames, []);
});

test('does not expose ask_user through _all_ when ask is disabled', () => {
    const result = selectAgentTools([...availableTools, tool('ask_user')], ['_all_']);

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), ['fetch_url', 'extension_tool']);
    assert.deepEqual(result.unavailableApprovedToolNames, []);
});

test('adds ask_user exactly once for legacy redundant configuration', () => {
    const result = selectAgentTools(
        [...availableTools, tool('ask_user')],
        ['ask_user'],
        tool('ask_user'),
    );

    assert.deepEqual(result.approvedTools.map((tool) => tool.name), ['ask_user']);
    assert.deepEqual(result.unavailableApprovedToolNames, []);
});

function tool(name) {
    return {
        name,
        description: `${name} description`,
        tool: {
            name,
            description: `${name} description`,
            execute: async () => ({ content: [], details: {} }),
        },
    };
}
