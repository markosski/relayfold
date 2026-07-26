---
title: Orchestrator Storage
description: Configure in-memory or durable SQL storage for workflow definitions and workflow state.
---

RunHelm stores workflow definitions, function definitions, workflow instances, workflow events, and workflow list summaries through the orchestrator storage adapter.

By default, the orchestrator uses in-memory storage. This is useful for local development, but workflow state is lost when the orchestrator process exits.

## In-memory storage

In-memory storage is the default:

```bash
RUNHELM_STORAGE=memory
```

You can also omit `RUNHELM_STORAGE`; `memory` is used automatically.

In-memory definitions, workflow state, task state, events, and list results are
isolated by the namespace selected for each request. Reusing the same definition
or workflow ID in another namespace creates an independent in-memory resource.

## Durable SQL storage

Use SQL storage when workflow definitions and workflow state should survive orchestrator restarts:

```bash
RUNHELM_STORAGE=sql
RUNHELM_DATABASE_URL=sqlite:///var/lib/runhelm/runhelm.db
```

The SQL adapter initializes its schema automatically on startup and records applied schema migrations in the database.

SQLite is the first supported SQL backend. The storage adapter detects the SQL dialect from `RUNHELM_DATABASE_URL`; Postgres and MySQL URL schemes are reserved for future backend support.

SQL definitions, workflow state, tasks, verifier state, events, and list results
are isolated by namespace. The same resource ID can be used independently in
different namespaces.

Namespace columns are declared as `VARCHAR(36)`, which accommodates both the
built-in `global-namespace` and canonical UUID strings. SQLite treats this
declaration with TEXT affinity and does not enforce the declared length;
namespace validation remains an orchestrator responsibility.

The namespace-aware SQL schema is a destructive compatibility boundary. RunHelm
does not migrate databases created by pre-namespace versions. Before upgrading,
stop the orchestrator and workers, back up state needed for rollback, and
recreate the SQL database. The orchestrator will initialize the current schema
when it next starts.

## Persistence model

SQL storage keeps workflow-level state, task attempts, verifier state, and events in separate tables. RunHelm still exposes the same workflow state model through the API.

Workflow definitions may enter and leave the API as JSON or YAML. Storage
normalizes definition payloads to JSON, so the selected API representation does
not change the persisted format.

Workflow transition commits are atomic: when the orchestrator records a workflow change, the SQL adapter saves the event records, workflow row, task rows, and verifier rows together. Workflow list summaries are derived from workflow and task rows when queried.

SQL storage does not make task execution exactly once. Tasks should still be designed for at-least-once execution. See [Reliability and Side Effects](/docs/operations/reliability/).
