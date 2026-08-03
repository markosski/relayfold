---
title: Use Cases
description: Practical ways to compose Relayfold agents, functions, and APIs into reliable workflows.
---

Relayfold is useful when a job needs more than one model response: several specialized steps, explicit handoffs, validation, human input, or a durable record of what ran. The patterns below are starting points for workflows you can adapt to your tools and policies.

## Scan repositories for vulnerabilities

Build a repeatable security review that combines deterministic scanners with agent judgment:

1. Check out a repository in a shared [workspace](/relayfold/docs/operations/workspaces/).
2. Run dependency, secret, and static-analysis tools from an Agent task.
3. Normalize tool output into a typed finding schema.
4. Ask a reviewing Agent to remove duplicates, explain impact, and recommend remediation.
5. Use a [bounded loop](/relayfold/docs/concepts/bounded-loops/) to revise findings that lack evidence.
6. Publish an approved report through an API task or pause for human approval first.

Keep scanners as the source of evidence and use agents to interpret and prioritize their output. Give each task only the repository access, tools, and credentials it needs.

## Generate recurring reports

Collect information from APIs, analyze it with specialized agents, verify the conclusions, and render the result for delivery. This pattern works for engineering health, operations, finance, customer feedback, and research summaries.

The [daily stock report example](/relayfold/docs/examples/daily-stock-report-workflow/) demonstrates parallel research, an analysis step, HTML generation, and email delivery in one observable run.

## Turn issues into reviewed pull requests

Fetch an issue, let an implementation Agent work in a repository workspace, verify the change in a bounded review loop, and open a pull request only after acceptance. The workflow can [request human input](/relayfold/docs/concepts/human-input/) when requirements are ambiguous.

See the runnable [GitHub issue-to-PR example](/relayfold/docs/examples/github-issue-pr-workflow/).

## Assess release readiness

Combine test results, dependency checks, change summaries, and deployment policy into a single release decision. Function tasks can enforce deterministic gates while an Agent evaluates qualitative evidence such as migration risk or incomplete release notes. Route exceptions to a human instead of silently passing them.

## Triage incidents

Gather alerts, recent deployments, logs, and service metadata in parallel; correlate the evidence; then produce a timeline and suggested next actions. Persisted workflow state makes the investigation inspectable, while human input lets an operator correct assumptions before a notification or remediation step runs.

For production operations, design API and function tasks to be safe to retry. See [Reliability and Side Effects](/relayfold/docs/operations/reliability/).

## Extract and validate structured data

Use an Agent to extract structured records from unstructured input, validate its output against a [task schema](/relayfold/docs/concepts/workflow-yaml/#task-input-and-output-schemas), and rerun extraction with verifier feedback when required fields are missing or unsupported. A downstream function or API task can then store only accepted records.

This pattern applies to support tickets, documents, research material, invoices, and other inputs that need a consistent contract before automation continues.

## Choose a first workflow

Start with a process that has a clear input, a reviewable output, and two to five distinct steps. Define the task contracts first, keep side effects in the final steps, and add a verifier or human checkpoint where a wrong result would be costly. Then follow [Register and Run a Workflow](/relayfold/docs/guides/register-and-run-workflow/) to implement it.
