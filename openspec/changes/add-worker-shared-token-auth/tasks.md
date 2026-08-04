## 1. Orchestrator Authentication

- [x] 1.1 Add required worker token startup configuration and constant-time bearer authentication middleware
- [x] 1.2 Protect `/workers/*` while keeping worker `/health` public
- [x] 1.3 Add orchestrator startup and route authentication tests, including mutation-free rejection

## 2. Worker Authentication

- [x] 2.1 Add required worker token startup configuration and attach it to every worker API request
- [x] 2.2 Make registration, heartbeat, claim, and result `401` responses terminate the worker
- [x] 2.3 Add worker tests for token configuration, headers, fatal authentication, and transient retry behavior

## 3. Deployment and Documentation

- [x] 3.1 Configure a shared development token for both Docker Compose services
- [x] 3.2 Update worker README and website installation, scaling, and API documentation

## 4. Verification

- [x] 4.1 Run OpenSpec validation, orchestrator tests, and worker tests/build
- [x] 4.2 Validate Docker Compose configuration and build the website
