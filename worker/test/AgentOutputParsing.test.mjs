import assert from 'node:assert/strict';
import test from 'node:test';
import { extractJsonString } from '../dist/adapters/executors/AgentExecutor.js';

test('preserves Markdown fences embedded in valid JSON string values', () => {
    const response = JSON.stringify({
        repository: 'parsablelabs/relayfold',
        body: [
            'Use this workflow configuration:',
            '```yaml',
            'headers:',
            '  Accept: "application/json"',
            '```',
        ].join('\n'),
    }, null, 2);

    const extracted = extractJsonString(response);

    assert.equal(extracted, response);
    assert.deepEqual(JSON.parse(extracted), JSON.parse(response));
});

test('unwraps a JSON code fence only when it encloses the complete response', () => {
    const response = [
        '```json',
        '{',
        '  "body": "contains ```yaml\\nkey: value\\n```"',
        '}',
        '```',
    ].join('\n');

    assert.deepEqual(JSON.parse(extractJsonString(response)), {
        body: 'contains ```yaml\nkey: value\n```',
    });
});

test('retains compatibility with a conversational prefix before JSON', () => {
    const extracted = extractJsonString('Here is the result:\n{"accepted":true}');

    assert.deepEqual(JSON.parse(extracted), { accepted: true });
});
