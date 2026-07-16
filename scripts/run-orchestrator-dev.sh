#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
orchestrator_dir="$repo_root/orchestrator"
binary="$orchestrator_dir/target/debug/orchestrator"

usage() {
  cat <<'USAGE'
Usage:
  scripts/run-orchestrator-dev.sh [--skip-build]

Build and run the local debug orchestrator binary without Docker.

Environment:
  RUNHELM_PUBLIC_HTTP_ADDR defaults to 127.0.0.1:3000.
  RUNHELM_WORKER_HTTP_ADDR defaults to 127.0.0.1:3001.
  RUNHELM_STORAGE selects memory (default), sqlite, or mysql.
  SQLite requires RUNHELM_STORE_SQLITE_PATH.
  MySQL requires RUNHELM_STORE_MYSQL_HOST, RUNHELM_STORE_MYSQL_USERNAME, and
  RUNHELM_STORE_MYSQL_PASSWORD. RUNHELM_STORE_MYSQL_DATABASE defaults to
  runhelm and RUNHELM_STORE_MYSQL_PORT defaults to 3306.
  RUST_LOG defaults to info.
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
  cargo build --manifest-path "$orchestrator_dir/Cargo.toml"
elif [[ ! -x "$binary" ]]; then
  echo "orchestrator binary not found at $binary; rerun without --skip-build" >&2
  exit 1
fi

export RUNHELM_PUBLIC_HTTP_ADDR="${RUNHELM_PUBLIC_HTTP_ADDR:-127.0.0.1:3000}"
export RUNHELM_WORKER_HTTP_ADDR="${RUNHELM_WORKER_HTTP_ADDR:-127.0.0.1:3001}"
export RUST_LOG="${RUST_LOG:-info}"

exec "$binary"
