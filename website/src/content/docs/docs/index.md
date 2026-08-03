---
title: RelayFold Documentation
description: Learn what RelayFold is and how its orchestrator, workers, and workflow model fit together.
---

RelayFold is an agentic workflow orchestrator for teams that want to compose AI agents, API calls, and code execution into reliable multi-step runs. Agent tasks use a provider-agnostic model interface, so each task can select the model provider that fits its role without changing the workflow execution model.

It is built around a separation between the control plane and execution plane:

- The **orchestrator** owns workflow definitions, run state, scheduling, and status APIs.
- The **worker** executes individual task payloads in an isolated runtime with typed inputs and outputs.

## Why RelayFold

Most agent demos stop at "the model produced an answer." Real systems need more structure:

- explicit workflow definitions instead of one-off prompts
- task dependencies and data flow between steps
- observable run state
- resumable execution
- typed contracts between tasks
- pluggable execution backends and credentials

RelayFold treats an agent the same way it treats a function or API task: as a node in a workflow with declared inputs, outputs, and credentials.

## RelayFold features

- **Provider-agnostic Agent tasks** — choose the model provider that fits each step without changing the workflow execution model.
- **Mixed task workflows** — compose AI agents, JavaScript functions, and direct API calls in one workflow, with explicit data bindings and optional schema validation between steps.
- **Agent-directed human input** — let an Agent request clarification only when it needs it, pause the workflow in `InputNeeded`, and continue from persisted state after a response.
- **Bounded verifier loops** — repeat AI agent task sequences with structured feedback and a configured attempt limit.
- **Observable, resumable runs** — inspect workflow and task state, follow lifecycle events, and retry or resume work without restarting the entire workflow.
- **Controlled execution environments** — grant each task only the tools, skills, credentials, and shared workspace access it needs.
- **Scalable worker execution** — separate orchestration from task execution so workers can register, claim tasks, and scale independently while preserving workflow-local state.

## Current status

> **RelayFold is still in an early development stage, expect bugs and breaking changes.**

## Where to start?

Start with the [install guide](/relayfold/docs/install/) for local setup, then try [Register and Run a Workflow](/relayfold/docs/guides/register-and-run-workflow/). After that, read the [workflow concepts](/relayfold/docs/concepts/workflows/), [task concepts](/relayfold/docs/concepts/tasks/), [workflow YAML reference](/relayfold/docs/concepts/workflow-yaml/), [API reference](/relayfold/docs/api-reference/), and [architecture overview](/relayfold/docs/concepts/architecture/).
