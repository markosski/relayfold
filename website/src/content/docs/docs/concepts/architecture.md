---
title: Architecture
description: Learn how RelayFold separates orchestration and task execution.
---

RelayFold separates control-plane concerns from execution concerns.

## Orchestrator

The Rust orchestrator owns workflow definitions, run state, scheduling, and status APIs.

Key responsibilities include:

- registering workflow definitions
- creating workflow instances
- tracking task and run state
- selecting runnable tasks
- dispatching runnable task payloads
- exposing HTTP endpoints for status and workflow operations

The current default wiring uses in-memory storage, an in-memory workflow queue, a worker registry for heartbeat and host eligibility, and a task dispatcher that queues work for registered workers.

## Worker

The TypeScript worker runtime executes individual task payloads.

Workers:

- register with the orchestrator worker API
- claim task payloads
- select an executor through `ExecutorFactory`
- execute agent, API-call, or function tasks
- validate task output against JSON Schema
- read required credentials through a credentials port

Function tasks run arbitrary code in an isolated Node.js child process. Agent tasks use a provider-agnostic model interface, approved tools, selected skills, and credentials loaded through the worker credential adapter.

## Ports and adapters

Side effects live behind ports and adapters. Storage, workflow queues, task dispatch, credentials, and worker execution are modeled as replaceable boundaries so the core orchestration logic can remain testable and cohesive.

## Scaling the deployment

RelayFold scales task execution by adding workers to an orchestrator's worker pool. At a larger deployment size, workloads can be partitioned across independent orchestrators with dedicated worker pools.

See [Scaling](/relayfold/docs/operations/scaling/) for deployment guidance and the distinction between worker scaling and orchestrator partitioning.
