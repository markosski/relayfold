#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
worker_dir="$repo_root/worker"
entrypoint="$worker_dir/dist/index.js"

usage() {
  cat <<'USAGE'
Usage:
  scripts/run-worker-dev.sh [--skip-build]

Build and run one local worker process without Docker.

Environment:
  RUNHELM_ORCHESTRATOR_HTTP_URL defaults to http://127.0.0.1:3001.
  RUNHELM_WORKER_HOST_ID defaults to local-dev-host.
  WORKER_ID defaults to local-dev-worker-<pid>.
  RUNHELM_WORKSPACE_ROOT defaults to ~/.cache/runhelm/workspaces.
USAGE
}

skip_build="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      skip_build="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$skip_build" == "false" ]]; then
  npm --prefix "$worker_dir" run build
elif [[ ! -f "$entrypoint" ]]; then
  echo "worker entrypoint not found at $entrypoint; rerun without --skip-build" >&2
  exit 1
fi

export RUNHELM_ORCHESTRATOR_HTTP_URL="${RUNHELM_ORCHESTRATOR_HTTP_URL:-http://127.0.0.1:3001}"
export RUNHELM_WORKER_HOST_ID="${RUNHELM_WORKER_HOST_ID:-local-dev-host}"
export WORKER_ID="${WORKER_ID:-local-dev-worker-$$}"

exec node "$entrypoint"
