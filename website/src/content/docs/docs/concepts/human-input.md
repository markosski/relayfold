---
title: Human Input
description: Use InputNeeded to pause workflows, ask for clarification, and continue after a human response.
---

Human input lets a workflow pause when an Agent task cannot safely continue without clarification. RelayFold records the task as `InputNeeded`, stores the question, and waits until an operator submits a response through the API.

Use human input when a workflow should not guess:

- an issue or request is underspecified
- an approval is required before an irreversible step
- a workflow needs a missing parameter such as release channel, target environment, or account ID
- an Agent needs a product or business decision that is not present in the inputs

<pre class="mermaid">
flowchart TB
    A["Agent task runs"]
    B{"Needs clarification?"}
    C["Return task output"]
    D["ask_user tool"]
    E["Workflow status: InputNeeded"]
    F["POST human-input"]
    G["Continuation attempt queued"]
    H["Agent completes with response"]

    A --> B
    B -->|"no"| C
    B -->|"yes"| D --> E
    E --> F --> G --> H
</pre>

## Agent configuration

Human input is currently an Agent-task capability. Enable it with `ask: true`.
RelayFold adds the built-in `ask_user` tool automatically, so it does not belong
in the task's `tools` list:

```yaml
tasks:
  - id: release-announcement
    kind:
      agent:
        model_id: "google/gemini-2.5-flash"
        provider_url: ""
        prompt: |
          Prepare an announcement from these release facts:
          - Added reusable Agent sessions.
          - Added human input for missing workflow decisions.

          Every announcement must target exactly one release channel: stable,
          beta, or nightly. Do not choose a channel on the operator's behalf.

          Return:
          {
            "response": "<a concise announcement appropriate for the channel>",
            "channel": "<channel>"
          }
        tools: []
        skills: []
        ask: true
        schema_failure_retry_times: 2
        reuse_session: true
    output_schema:
      type: object
      required:
        - response
        - channel
      properties:
        response:
          type: string
        channel:
          type: string
          enum:
            - stable
            - beta
            - nightly
    required_credentials:
      - gemini_api_key
```

When `ask` is false, `ask_user` remains unavailable even if `tools` contains
`ask_user` or `"_all_"`. When the enabled Agent calls `ask_user`, the task
returns `input_needed` instead of normal output. The workflow instance moves to
`InputNeeded`.

The task prompt should describe the goal, required information, and constraints.
It does not need to tell the Agent how to detect a submitted response or script
when to call `ask_user`. When the Agent finds that essential information is
missing, the capability provided by `ask: true` lets it gather that information
and continue naturally after the operator responds.

## Inspecting the request

List or read workflow status:

```bash
curl -sS "$RELAYFOLD_URL/workflows/human-input-agent-workflow-1780000000000000000"
```

Task results expose the question as `input_request`:

```bash
curl -sS "$RELAYFOLD_URL/workflows/human-input-agent-workflow-1780000000000000000/tasks/release-announcement"
```

Example response:

```json
{
  "status": "input_needed",
  "input": [],
  "input_request": "Which release channel should this summary target: stable, beta, or nightly?",
  "task_def_id": "release-announcement",
  "task_attempt_id": "release-announcement[1]",
  "satisfaction": "Unsatisfied",
  "generation_index": 1
}
```

## Submitting input

Submit the human response to the waiting logical task:

```bash
curl -sS -X POST "$RELAYFOLD_URL/workflows/human-input-agent-workflow-1780000000000000000/tasks/release-announcement/human-input" \
  -H 'content-type: application/json' \
  -d '{ "input": "stable" }'
```

Response:

```json
{
  "status": "queued",
  "workflow_instance_id": "human-input-agent-workflow-1780000000000000000",
  "task_attempt_id": "release-announcement[2]"
}
```

RelayFold records the submitted input and queues a continuation attempt for the same logical task. The Agent receives the response as the current human-input event and can finish the task with normal structured output.

## Workflow behavior

`InputNeeded` is workflow-blocking. When any task asks for human input, RelayFold stops the current engine pass after recording the state. Independent branches that could otherwise run remain pending until human input is submitted and the workflow is queued again.

If the task has `reuse_session: true`, the continuation attempt can reuse the Agent conversation session. This is useful when the Agent already built context before asking the question.

## API errors

The human-input endpoint returns:

- `404 Not Found` when the workflow or task does not exist.
- `409 Conflict` when the workflow is not waiting for input.
- `409 Conflict` when the task is not an Agent task.
- `409 Conflict` when a continuation has already been materialized for the waiting attempt.

## Design guidance

Ask only for the missing decision. A good `ask_user` question is specific enough that the operator can answer without reading the entire workflow history.

Prefer human input before irreversible side effects. For example, ask for deployment approval before a publish task, not after the publish task has already run.

Use schemas on the final Agent output so the workflow can validate the resumed result before downstream tasks consume it.
