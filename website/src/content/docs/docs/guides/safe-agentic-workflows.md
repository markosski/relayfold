---
title: Safe Agentic Workflows
description: Structure autonomous workflows so Agents read and decide while narrow Function tasks mutate external systems.
---

A useful default for workflows that interact with real systems is:

> **Agents generate decisions. Functions exercise authority.**

Give Agent tasks the context and read access needed to inspect a system, reason
about its state, and generate content. Route writes and other consequential
operations through narrow Function tasks that validate the decision before
changing the system.

```text
Read with an Agent
        ↓
Generate a structured decision
        ↓
Validate the output schema
        ↓
Mutate through a Function
```

This split keeps workflows autonomous for known safe cases. Human input remains
available for ambiguity and exceptional risk instead of being required for
every action.

## Separate observation, decision, and mutation

Assign each task one clear responsibility:

1. An Agent reads the relevant system state and returns both the available
   candidates and its proposed action.
2. RelayFold validates that output against the Agent's `output_schema`.
3. A Function independently validates the proposal, refreshes current state,
   and performs the approved operation.

For example, an issue-maintenance Agent might return:

```json
{
  "candidates": [
    {
      "repository": "example/docs",
      "issue_number": 143,
      "title": "Remove outdated setup instructions",
      "updated_at": "2026-01-12",
      "labels": ["documentation"]
    }
  ],
  "selected_issue_numbers": [143],
  "reason": "The issue has been inactive longer than the configured threshold."
}
```

The downstream Function receives the complete output through a data binding. It
must verify that every selected issue appears in `candidates`; it should not
trust an identifier merely because the Agent returned it in the correct JSON
shape.

```yaml
data_bindings:
  - source_task_id: inspectissues
    target_task_id: closestaleissues
```

Keep the mutation outside any verifier rerun slice. If a verifier is needed,
place it between the Agent and the Function:

```text
inspect and propose -> verify proposal -> mutate
```

## Treat schemas as contracts, not proof of provenance

Declare narrow input and output schemas whenever a downstream task depends on
specific fields. Prefer:

- required properties
- enums instead of arbitrary strings
- bounded numbers and array sizes
- `additionalProperties: false` where appropriate
- explicit formats for dates, email addresses, and URIs

Schema validation prevents malformed Agent output from flowing downstream. It
does **not** prove that an identifier came from a trusted read, that a record
still exists, or that the operation remains safe.

Until an application has a stronger trusted-reference mechanism, carry the
observed candidates forward with the Agent's selection. The Function can then
allow only selected identifiers present in that candidate set and scoped to the
configured tenant, repository, account, or environment.

Do not let an Agent freely generate authority-bearing values such as:

- account, tenant, repository, or resource identifiers
- payment recipients
- production environment names
- permission targets
- destination email addresses

An Agent can safely generate explanatory or content fields such as a reason,
summary, subject, message body, or classification. Functions should constrain
generated operational values with enums, limits, allowlists, or application
policy.

## Give Agents read-only capabilities

An Agent that classifies or summarizes data usually needs no tools. An Agent
that inspects an external system should receive only the read tools and
credentials required for that inspection.

Avoid giving the same Agent generic mutation capabilities such as:

- arbitrary HTTP requests
- unrestricted shell access
- raw SQL execution
- broad write-enabled SDKs or credentials

Tool names and credentials are separate controls. Keep both lists narrow. A
read-only prompt is not a security boundary if the supplied tool or credential
can write.

When a workflow needs generated content for an operation, have the Agent return
that content as structured output. For example, an Agent may draft an email
body while the Function accepts the recipient only from configured or observed
data.

## Make mutation Functions specific

Prefer a Function named for one business operation:

```text
close_stale_issues
deploy_verified_artifact
disable_compromised_user
send_approved_invoice
```

Avoid generic mutation Functions such as:

```text
http_request
execute_sql
run_shell
```

A specific Function can embed the invariants for one action. A Function that
closes stale issues might:

1. Reject issues outside the configured repository.
2. Confirm that every selected identifier was among the candidates.
3. Fetch each issue again immediately before mutation.
4. Reject issues with a protected label or recent activity.
5. Enforce a maximum batch size.
6. Use an idempotent operation or deduplication key.
7. Return one recorded result per requested issue.

Give each mutation task a single responsibility. Avoid combining independent
side effects such as updating a record, sending a notification, and writing an
audit entry in one Function task. If the task fails after completing only some
of those operations, retrying it may execute the completed operations again.

Split independent mutations into separate tasks with explicit data bindings:

```text
update record -> send notification -> record audit result
```

Each task can then use the appropriate idempotency check, report its own result,
and retry without repeating unrelated operations. Keep operations together only
when the external system provides a transaction or one idempotent API operation
that makes them a single atomic responsibility.

Register reusable integration Functions in the
[Function Registry](/relayfold/docs/guides/function-registry/). Keep small,
workflow-specific policy code inline when reuse would obscure the policy.

## Re-read before writing

State can change after the Agent observes it. A person might update a ticket,
cancel an invoice, change a deployment, or protect a resource while the Agent
is reasoning.

The mutation Function should normally fetch current state immediately before
the write and re-evaluate every important precondition:

```text
Agent reads initial state
        ↓
Agent selects an action
        ↓
Function re-reads current state
        ↓
Function checks invariants
        ↓
Function writes or refuses
```

This check belongs in the Function even when the Agent already performed the
same check. The Function is the authority boundary and must remain safe when
the proposal is stale, malformed, or simply wrong.

## Design for at-least-once execution

RelayFold tasks may execute more than once during retry and recovery. Mutation
Functions must therefore be safe to repeat.

Use provider idempotency keys, stable upsert keys, or an explicit check for an
already-completed operation. Bound batch sizes and return separate outcomes for
successes, skips, policy rejections, and failures so a retry can reconcile
partial progress.

Keep mutation tasks small and single-purpose so a failure has the narrowest
possible retry scope. A retry of `sendnotification` should not also repeat an
already-successful `updaterecord` operation.

Place irreversible work late, after all reasoning and verification. See
[Reliability and Side Effects](/relayfold/docs/operations/reliability/) for the
full retry model.

## Escalate exceptions, not every action

Autonomy and safety do not require choosing between unrestricted writes and
mandatory approval for every run. Define a safe operating envelope:

```text
Known safe case      -> Function executes
Known unsafe case    -> Function rejects
Ambiguous/high-risk  -> request human input
```

Useful escalation conditions include:

- a batch exceeds its automatic limit
- the target is a protected or production resource
- the Agent's output is ambiguous or incomplete
- current state differs materially from the observed state
- an operation is irreversible or unusually high value

Use [Human Input](/relayfold/docs/concepts/human-input/) for those exceptions.
Do not ask a human to approve cases that deterministic policy can safely accept
or reject.

## Review checklist

Before registering a workflow that changes an external system, confirm:

- Agent tools and credentials are read-only and minimally scoped.
- Agent output has a strict schema.
- Authority-bearing identifiers come from workflow input or observed candidates,
  rather than free-form generation.
- The mutation Function checks selected identifiers against allowed candidates
  and system scope.
- The Function re-reads current state and enforces invariants before writing.
- The Function represents a specific business operation, not a generic command
  or request executor.
- Each mutation task has one responsibility, so retries do not repeat unrelated
  side effects.
- Mutations are idempotent and tolerate partial completion.
- Irreversible work is outside verifier rerun slices and occurs late.
- Batch, value, tenant, and environment limits are enforced in code.
- Ambiguous or high-risk exceptions have a deliberate rejection or human-input
  path.
