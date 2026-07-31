---
title: Human Input Workflow
description: A workflow that pauses in InputNeeded and continues after an operator response.
---

This example gives an Agent enough release facts to prepare an announcement, but
omits a required business decision: the target release channel. The Agent must
recognize that it cannot complete the task without inventing information and ask
the operator for the missing decision.

The ready-to-run definition is
`worker/examples/example_human_input_workflow.yaml`.

## Workflow definition

```yaml
id: human-input-agent-workflow

tasks:
  - id: release-announcement
    kind:
      agent:
        model_id: "google/gemini-2.5-flash"
        provider_url: ""
        prompt: |
          You are a release coordinator preparing an announcement for RunHelm 1.4.0.

          Release facts:
          - Added reusable Agent sessions.
          - Added human input for missing workflow decisions.
          - Fixed duplicate task attempts after workflow resume.

          Every announcement must target exactly one release channel: stable,
          beta, or nightly. Do not invent release facts or choose a channel on
          the operator's behalf.

          Return exactly this JSON shape:
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

data_bindings: []
```

`ask: true` automatically enables RunHelm's built-in `ask_user` tool. It does
not need to be listed in `tools`.

## Configure credentials

Add the model credential to `~/.runhelm/file_credentials.json`:

```json
{
  "gemini_api_key": "..."
}
```

## Register and start

Register the example YAML directly with the API:

```bash
export RUNHELM_URL=http://localhost:3000

curl -sS -X POST "$RUNHELM_URL/workflow-def" \
  --data-binary @worker/examples/example_human_input_workflow.yaml
```

Start an instance:

```bash
curl -sS -X POST "$RUNHELM_URL/workflow-def/human-input-agent-workflow" \
  -H 'content-type: application/json' \
  -d '{}'
```

Because the required channel is absent, the run should eventually move to
`InputNeeded`. The prompt does not tell the Agent to inspect for a previous
response or prescribe a question. The Agent discovers the missing decision from
the task constraints and uses the human-input capability made available by
`ask: true`.

## Inspect the question

Read the task result:

```bash
curl -sS "$RUNHELM_URL/workflows/human-input-agent-workflow-1780000000000000000/tasks/release-announcement"
```

Example response (the exact wording is chosen by the Agent):

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

## Submit the answer

```bash
curl -sS -X POST "$RUNHELM_URL/workflows/human-input-agent-workflow-1780000000000000000/tasks/release-announcement/human-input" \
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

## Final result

After the continuation runs, read the task result again:

```bash
curl -sS "$RUNHELM_URL/workflows/human-input-agent-workflow-1780000000000000000/tasks/release-announcement"
```

Example output:

```json
{
  "status": "success",
  "input": [],
  "output": {
    "response": "RunHelm 1.4.0 adds reusable Agent sessions and human input for missing workflow decisions, and fixes duplicate task attempts after resume.",
    "channel": "stable"
  },
  "task_def_id": "release-announcement",
  "task_attempt_id": "release-announcement[2]",
  "satisfaction": "Satisfied",
  "generation_index": 2
}
```

See [Human Input](/runhelm/docs/concepts/human-input/) for the full behavior and design guidance.
