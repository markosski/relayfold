---
title: RunHelm Documentation
description: Learn what RunHelm is and how its orchestrator, workers, and workflow model fit together.
---

RunHelm is an agentic workflow orchestrator for teams that want to compose AI agents, API calls, and code execution into reliable multi-step runs. Agent tasks use a provider-agnostic model interface, so each task can select the model provider that fits its role without changing the workflow execution model.

It is built around a separation between the control plane and execution plane:

- The **orchestrator** owns workflow definitions, run state, scheduling, and status APIs.
- The **worker** executes individual task payloads in an isolated runtime with typed inputs and outputs.

## Why RunHelm

Most agent demos stop at "the model produced an answer." Real systems need more structure:

- explicit workflow definitions instead of one-off prompts
- task dependencies and data flow between steps
- observable run state
- resumable execution
- typed contracts between tasks
- pluggable execution backends and credentials

RunHelm treats an agent the same way it treats a function or API task: as a node in a workflow with declared inputs, outputs, and credentials.

## Current status

RunHelm is in an early implementation stage. The repository already includes the core workflow engine, orchestration API skeleton, in-memory storage and queue adapters, worker registration plus task dispatch, and a TypeScript worker runtime.

Start with the [install guide](/runhelm/docs/install/) for local setup, then try [Register and Run a Workflow](/runhelm/docs/guides/register-and-run-workflow/). After that, read the [workflow concepts](/runhelm/docs/concepts/workflows/), [task concepts](/runhelm/docs/concepts/tasks/), [workflow YAML reference](/runhelm/docs/concepts/workflow-yaml/), [API reference](/runhelm/docs/api-reference/), and [architecture overview](/runhelm/docs/concepts/architecture/).
