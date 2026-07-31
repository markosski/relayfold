---
title: Install RunHelm Locally
description: Run RunHelm locally with Docker and the runhelm wrapper.
---

The Docker-first local install path does not require Rust, Node.js, or a source checkout after installation. It uses prebuilt images by default and manages local config under `~/.runhelm`.

:::caution
This local install path is intended for development and evaluation only. It is
not suitable for production deployments. For a production-shaped topology, see
[Live Deployment](/runhelm/docs/operations/live-deployment/).
:::

```bash
curl -fsSL https://raw.githubusercontent.com/markosski/runhelm/main/packaging/install.sh | sh
runhelm init --version dev # dev for unstable or release tag
runhelm up
runhelm status
```

The `--version dev` option configures the local environment to use the current
development images.

## Local files

`runhelm init` creates local state under:

```text
~/.runhelm/
  config.env
  file_credentials.json
  docker-compose.yml
  cache/
  skills/
  workspaces/
  workflows/
```

The generated config is written to `~/.runhelm/config.env`, and the generated Compose file is written to `~/.runhelm/docker-compose.yml`.
The installer places the canonical Compose template beside the `runhelm`
executable, and `runhelm init` copies that template into the local environment.
Workflow definitions and run state are persisted in the `runhelm-storage`
Docker volume using SQLite.

## Global namespace mode

Public resource endpoints require a namespace. Local and single-tenant
deployments can select the readable built-in global namespace:

:::caution
Bearer-token API-key authentication is not fully implemented yet. The generated
local Compose environment sets `RUNHELM_USE_GLOBAL_NAMESPACE=true` so public
resource endpoints are usable.
:::

```text
RUNHELM_USE_GLOBAL_NAMESPACE=true
```

When enabled, RunHelm selects the exact namespace `global-namespace`. This mode
is authoritative, so public requests do not need an authorization header and
ignore one if supplied.

When `RUNHELM_USE_GLOBAL_NAMESPACE` is unset or `false`, missing or malformed
bearer credentials return `401 Unauthorized`. A well-formed bearer credential
cannot authenticate requests until API-key-to-namespace resolution is
implemented. Values other than `true` or `false` are invalid. Health checks
remain available without namespace configuration or authorization.

The repository's local-development `docker-compose.yml` explicitly uses
`RUNHELM_USE_GLOBAL_NAMESPACE=true`.

## Image overrides

Override image references in `~/.runhelm/config.env` when using an internal registry:

```text
RUNHELM_ORCHESTRATOR_IMAGE=registry.example.com/runhelm-orchestrator:dev
RUNHELM_WORKER_IMAGE=registry.example.com/runhelm-worker:dev
```

## Self-build path

Users who need to own their image artifacts can build them from a checkout or git ref:

```bash
packaging/build-images.sh --ref v0.3.1 --tag-prefix registry.example.com/runhelm --push
```

Use the source-build path for contributor workflows or controlled image publishing. The normal local-user path should stay Docker-first and use published images.
