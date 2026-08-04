## MODIFIED Requirements

### Requirement: Orchestrator IPC Server
The Orchestrator SHALL host a dedicated HTTP server to receive requests from
long-lived worker processes.

#### Scenario: Orchestrator starts worker HTTP server
- **WHEN** the Orchestrator application starts
- **THEN** it binds the worker HTTP API to `RELAYFOLD_WORKER_HTTP_ADDR`, defaulting to `127.0.0.1:3001`

### Requirement: Worker Connection and Registration
Workers SHALL register through the authenticated Orchestrator worker HTTP API
and identify their worker process and configured stable host identity.

#### Scenario: Successful worker registration
- **WHEN** a Worker posts valid authentication, worker ID, and host ID to `/workers/register`
- **THEN** the Orchestrator records that worker identity in the worker registry
- **AND** the Orchestrator returns the heartbeat interval the worker must use

#### Scenario: Worker registration omits host identity
- **WHEN** a Worker registers without a host ID
- **THEN** the Orchestrator rejects the registration

### Requirement: Task Completion via Response API
Workers SHALL send task results to the authenticated Orchestrator worker HTTP
API.

#### Scenario: Worker returns task result
- **WHEN** a worker finishes a task and posts its result to `/workers/tasks/{task_id}/result`
- **THEN** the Orchestrator routes the result to the claimed workflow task and acknowledges it

### Requirement: Connection Failure Detection
The Orchestrator SHALL use heartbeat deadlines and dispatch leases to detect
worker loss because HTTP requests do not retain a worker connection.

#### Scenario: Worker stops while idle
- **WHEN** a worker stops renewing its heartbeat
- **THEN** the Orchestrator marks it unavailable and later deregisters it according to the liveness policy

#### Scenario: Worker stops while busy
- **WHEN** a worker stops renewing its heartbeat before returning a task result
- **THEN** the Orchestrator expires or releases its dispatch lease according to recovery policy
