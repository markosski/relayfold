# RunHelm

<p align="center">
  <img src="runhelm_logo_large.png" alt="RunHelm logo" width="670">
</p>

RunHelm is an agentic workflow orchestrator for composing AI agents, JavaScript
functions, and API calls into reliable, observable multi-step runs.

Workflows define task dependencies, data flow, schemas, credentials, and
execution constraints. Orchestrator manages workflow state and
scheduling, while workers execute tasks in isolated runtimes. This
separation lets execution scale independently without giving up a consistent, observable
workflow model.

> RunHelm is in early development. Expect bugs and breaking changes.

## What RunHelm Provides

- Mixed workflows of [Agent, Function, and API Call tasks](https://markosski.github.io/runhelm/docs/concepts/tasks/)
- Explicit [workflow data flow and runtime state](https://markosski.github.io/runhelm/docs/concepts/workflows/)
- Observable runs that can be [paused, resumed, and retried](https://markosski.github.io/runhelm/docs/concepts/workflow-lifecycle/)
- [Human input](https://markosski.github.io/runhelm/docs/concepts/human-input/) and [bounded verifier loops](https://markosski.github.io/runhelm/docs/concepts/bounded-loops/) for agentic workflows
- Controlled access to [credentials](https://markosski.github.io/runhelm/docs/operations/credentials/) and [workspaces](https://markosski.github.io/runhelm/docs/operations/workspaces/)
- Independently scalable [orchestrators and workers](https://markosski.github.io/runhelm/docs/operations/scaling/)

## Get Started

The [RunHelm documentation](https://markosski.github.io/runhelm/docs/) is the
authoritative source for installation, concepts, guides, examples, and API
details.

- [Install RunHelm locally](https://markosski.github.io/runhelm/docs/install/)
- [Register and run your first workflow](https://markosski.github.io/runhelm/docs/guides/register-and-run-workflow/)
- [Read the workflow YAML reference](https://markosski.github.io/runhelm/docs/concepts/workflow-yaml/)
- [Try a simple Function workflow](https://markosski.github.io/runhelm/docs/examples/simple-function-workflow/)
- [Use the API reference](https://markosski.github.io/runhelm/docs/api-reference/)
- [Understand the architecture](https://markosski.github.io/runhelm/docs/concepts/architecture/)

## Repository Layout

- [`orchestrator/`](orchestrator/) — Rust control plane for workflow state,
  scheduling, persistence, and APIs
- [`worker/`](worker/) — TypeScript runtime for executing workflow tasks
- [`website/`](website/) — project website and user documentation
