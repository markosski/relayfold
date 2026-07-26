import assert from 'node:assert/strict';
import test from 'node:test';
import {
    agentSessionKey,
    serializeAgentSessionKey,
} from '../dist/core/models/AgentSession.js';

test('derives the same logical session key for a human-input continuation-shaped payload', () => {
    const initialPayload = taskPayload({
        workflow_inst_id: 'workflow-1',
        generation_index: 1,
    });
    const humanInputPayload = taskPayload({
        workflow_inst_id: 'workflow-1',
        generation_index: 2,
        input_provided: 'Use the customer name from the support ticket.',
    });

    assert.equal(
        serializeAgentSessionKey(agentSessionKey(initialPayload)),
        '550e8400-e29b-41d4-a716-446655440000$workflow-1$draft-response'
    );
    assert.equal(
        serializeAgentSessionKey(agentSessionKey(humanInputPayload)),
        '550e8400-e29b-41d4-a716-446655440000$workflow-1$draft-response'
    );
});

test('derives the same logical session key for a verifier-feedback continuation-shaped payload', () => {
    const initialPayload = taskPayload({
        workflow_inst_id: 'workflow-1',
        generation_index: 1,
    });
    const verifierFeedbackPayload = taskPayload({
        workflow_inst_id: 'workflow-1',
        generation_index: 2,
        loop_context: {
            generation: 2,
            max_iterations: 3,
            feedback_history: [
                {
                    generation: 1,
                    feedback: 'Add the missing source citation.',
                },
            ],
            previous_output: {
                draft: 'Initial answer without citation.',
            },
        },
    });

    assert.equal(
        serializeAgentSessionKey(agentSessionKey(initialPayload)),
        '550e8400-e29b-41d4-a716-446655440000$workflow-1$draft-response'
    );
    assert.equal(
        serializeAgentSessionKey(agentSessionKey(verifierFeedbackPayload)),
        '550e8400-e29b-41d4-a716-446655440000$workflow-1$draft-response'
    );
});

test('serializes logical session key without filesystem path separators', () => {
    assert.equal(
        serializeAgentSessionKey({
            namespace: '550e8400-e29b-41d4-a716-446655440000',
            workflowInstId: 'workflow-1',
            taskId: 'draftresponse',
        }),
        '550e8400-e29b-41d4-a716-446655440000$workflow-1$draftresponse'
    );
});

test('isolates identical workflow and task session keys by namespace', () => {
    const first = taskPayload({
        namespace: '550e8400-e29b-41d4-a716-446655440000',
        workflow_inst_id: 'workflow-1',
        generation_index: 1,
    });
    const second = taskPayload({
        namespace: '550e8400-e29b-41d4-a716-446655440001',
        workflow_inst_id: 'workflow-1',
        generation_index: 1,
    });

    assert.notEqual(
        serializeAgentSessionKey(agentSessionKey(first)),
        serializeAgentSessionKey(agentSessionKey(second))
    );
});

function taskPayload(overrides) {
    return {
        namespace: overrides.namespace ?? '550e8400-e29b-41d4-a716-446655440000',
        workflow_inst_id: overrides.workflow_inst_id,
        task: {
            id: 'draft-response',
            kind: {
                Agent: {
                    model_id: 'test/model',
                    provider_url: '',
                    prompt: 'Draft a customer response.',
                    tools: [],
                    skills: [],
                    reuse_session: true,
                },
            },
            required_credentials: [],
        },
        inputs: [],
        execution_metadata: {
            generation_index: overrides.generation_index,
            ...(overrides.loop_context !== undefined
                ? { loop_context: overrides.loop_context }
                : {}),
        },
        ...(overrides.input_provided !== undefined
            ? { input_provided: overrides.input_provided }
            : {}),
    };
}
