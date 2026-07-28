## Context

The worker currently registers `ask_user` only when an Agent task sets
`ask: true`, then passes all registered tools through the ordinary `tools`
allowlist. HITL therefore works only when the same task also names `ask_user`
or authorizes `_all_`. The `ask` flag already controls HITL-specific prompt
guidance and is the natural single authority for this workflow capability.

## Goals / Non-Goals

**Goals:**

- Make `ask: true` sufficient to enable HITL.
- Prevent ordinary wildcard tool authorization from enabling HITL.
- Preserve existing workflows that set both `ask: true` and list `ask_user`.
- Keep disabled HITL configuration harmless and free of bespoke validation.

**Non-Goals:**

- Changing human-input API, persistence, or continuation behavior.
- Removing the `ask` field or changing other tool-selection semantics.
- Adding warnings or validation for redundant `ask_user` tool entries.

## Decisions

The executor will select ordinary approved tools first and then append the
built-in `ask_user` tool only when `ask` is true. This makes the capability
independent of the ordinary allowlist while retaining one final list supplied
to the Agent runtime.

When `ask` is false, the executor will not register `ask_user`. Existing tool
selection already ignores unavailable requested tools, so explicit
`ask_user` entries and `_all_` cannot enable HITL. No new validation or warning
path is needed.

The `ask_user` tool remains worker-built-in rather than becoming a generally
registered tool. This preserves the security boundary that only the explicit
`ask` capability flag can pause a workflow.

## Risks / Trade-offs

- [The ordinary `tools` list is no longer the complete visible tool set when
  HITL is enabled] → Document `ask` as a first-class Agent capability and omit
  `ask_user` from recommended tool lists.
- [Older definitions retain a redundant `ask_user` entry] → Continue accepting
  and silently ignoring the duplicate; no migration is required.
