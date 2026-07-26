## ADDED Requirements

### Requirement: Namespace-Preserving Worker Execution
Worker task claim contracts SHALL preserve the namespace assigned by the orchestrator without resolving namespace from worker environment or public request credentials. Worker results SHALL correlate to the claimed task through its globally unique dispatch ID without repeating namespace.

#### Scenario: Worker receives task namespace
- **WHEN** a worker claims a task
- **THEN** the task payload identifies the namespace that owns the workflow execution

#### Scenario: Worker returns result through claimed dispatch
- **WHEN** a worker reports a task result
- **THEN** it posts the execution result through the claimed dispatch ID
- **AND** the result payload does not repeat namespace

#### Scenario: Worker configuration cannot change task namespace
- **WHEN** worker environment differs from orchestrator namespace configuration
- **THEN** the worker executes using the namespace carried by the claimed task
- **AND** it does not derive a replacement namespace from local configuration
