#!/usr/bin/env sh
set -eu

usage() {
  cat <<'USAGE'
Usage:
  packaging/build-images.sh [--ref REF] [--tag-prefix PREFIX] [--version VERSION] [--push]

Build RelayFold runtime images from the current checkout or from a git ref.

Options:
  --ref REF             Git ref to archive and build, for example v0.3.1.
  --tag-prefix PREFIX   Image prefix, default ghcr.io/markosski.
  --version VERSION     Image tag, default is REF without a leading v, or dev.
  --push                Push images after building.

Examples:
  packaging/build-images.sh --version dev --tag-prefix localhost/relayfold
  packaging/build-images.sh --ref v0.3.1 --tag-prefix registry.example.com/relayfold --push
USAGE
}

ref=""
tag_prefix="ghcr.io/markosski"
version=""
push="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --ref)
      ref="${2:-}"
      shift 2
      ;;
    --tag-prefix)
      tag_prefix="${2:-}"
      shift 2
      ;;
    --version)
      version="${2:-}"
      shift 2
      ;;
    --push)
      push="true"
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

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if [ -z "$version" ]; then
  if [ -n "$ref" ]; then
    version="${ref#v}"
  else
    version="dev"
  fi
fi

context="."
tmpdir=""
cleanup() {
  if [ -n "$tmpdir" ] && [ -d "$tmpdir" ]; then
    rm -rf "$tmpdir"
  fi
}
trap cleanup EXIT INT TERM

if [ -n "$ref" ]; then
  if ! command -v git >/dev/null 2>&1; then
    echo "git is required when --ref is used" >&2
    exit 1
  fi
  tmpdir="$(mktemp -d)"
  git archive --format=tar "$ref" | tar -x -C "$tmpdir"
  context="$tmpdir"
fi

build_image() {
  name="$1"
  dockerfile="$2"
  docker_context="$3"
  tag="$tag_prefix/relayfold-$name:$version"

  echo "Building $tag"
  docker build -f "$dockerfile" -t "$tag" "$docker_context"

  if [ "$push" = "true" ]; then
    echo "Pushing $tag"
    docker push "$tag"
  fi
}

build_image orchestrator "$context/orchestrator/Dockerfile" "$context/orchestrator"
build_image worker "$context/worker/Dockerfile" "$context/worker"
