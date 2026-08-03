---
title: Human Input Workflow
description: A workflow that pauses in InputNeeded and continues after an operator response.
---

This example gives an Agent enough release facts to prepare an announcement, but
omits a required business decision: the target release channel. The Agent must
recognize that it cannot complete the task without inventing information and ask
the operator for the missing decision.

The ready-to-run definition is
[`examples/example_human_input_workflow.yaml`](https://github.com/markosski/relayfold/blob/main/examples/example_human_input_workflow.yaml)

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
          You are a release coordinator preparing an announcement for RelayFold 1.4.0.

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

`ask: true` automatically enables RelayFold's built-in `ask_user` tool. It does
not need to be listed in `tools`.

## Configure credentials

Add the model credential to `~/.relayfold/file_credentials.json`:

```json
{
  "gemini_api_key": "..."
}
```

## Register the workflow

Download and register the example YAML directly from GitHub:

```bash
export RELAYFOLD_URL=http://localhost:3000

curl -fsSL https://raw.githubusercontent.com/markosski/relayfold/main/examples/example_human_input_workflow.yaml \
  | curl -fsS -X POST "$RELAYFOLD_URL/workflow-def" \
      --data-binary @-
```

## Execute the workflow

```bash
curl -fsS -X POST "$RELAYFOLD_URL/workflow-def/human-input-agent-workflow" \
  -H 'content-type: application/json' \
  -d '{}'
```

Because the required channel is absent, the run should eventually move to
`InputNeeded`. The prompt does not tell the Agent to inspect for a previous
response or prescribe a question. The Agent discovers the missing decision from
the task constraints and uses the human-input capability made available by
`ask: true`.

## Inspect the question

Replace `<workflow_id>` with the `id` returned when you executed the workflow,
then read the task result:

```bash
curl -fsS "$RELAYFOLD_URL/workflows/<workflow_id>/tasks/release-announcement"
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
curl -fsS -X POST "$RELAYFOLD_URL/workflows/<workflow_id>/tasks/release-announcement/human-input" \
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

## Check the output

After the continuation runs, read the task result again:

```bash
curl -fsS "$RELAYFOLD_URL/workflows/<workflow_id>/tasks/release-announcement"
```

Example output:

```json
{
  "status": "success",
  "input": [],
  "output": {
    "response": "RelayFold 1.4.0 is now live on the stable channel. This update introduces reusable Agent sessions, enables human input for workflow decisions, and resolves a bug causing duplicate task attempts when resuming workflows.",
    "channel": "stable"
  },
  "task_def_id": "release-announcement",
  "task_attempt_id": "release-announcement[2]",
  "satisfaction": "Satisfied",
  "generation_index": 2
}
```

See [Human Input](/relayfold/docs/concepts/human-input/) for the full behavior and design guidance.
