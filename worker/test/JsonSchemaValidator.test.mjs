import assert from 'node:assert/strict';
import test from 'node:test';
import { createJsonSchemaValidator } from '../dist/core/JsonSchemaValidator.js';

test('validates standard date, email, and URI formats', () => {
    const validate = createJsonSchemaValidator().compile({
        type: 'object',
        required: ['date', 'email', 'uri'],
        properties: {
            date: { type: 'string', format: 'date' },
            email: { type: 'string', format: 'email' },
            uri: { type: 'string', format: 'uri' },
        },
    });

    assert.equal(
        validate({
            date: '2026-07-31',
            email: 'analyst@example.com',
            uri: 'https://example.com/report',
        }),
        true
    );
    assert.equal(
        validate({
            date: '2026-13-40',
            email: 'not-an-email',
            uri: 'not a uri',
        }),
        false
    );
});
