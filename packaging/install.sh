#!/usr/bin/env sh
set -eu

install_dir="${RUNHELM_INSTALL_DIR:-$HOME/.local/bin}"
source_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
install_ref="${RUNHELM_INSTALL_REF:-main}"
raw_base="${RUNHELM_RAW_BASE:-https://raw.githubusercontent.com/markosski/runhelm/$install_ref}"

mkdir -p "$install_dir"

install_packaging_file() {
  name="$1"
  target="$2"
  mode="$3"
  local_path="$source_dir/$name"

  if [ -f "$local_path" ]; then
    cp "$local_path" "$target"
  else
    if ! command -v curl >/dev/null 2>&1; then
      echo "curl is required when installing without a local checkout" >&2
      exit 1
    fi
    curl -fsSL "$raw_base/packaging/$name" -o "$target"
  fi

  chmod "$mode" "$target"
}

install_packaging_file runhelm "$install_dir/runhelm" 755
install_packaging_file build-images.sh "$install_dir/build-images.sh" 755
install_packaging_file docker-compose.release.yml "$install_dir/docker-compose.release.yml" 644

echo "Installed runhelm to $install_dir/runhelm"
case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) echo "Add $install_dir to PATH to run runhelm from any directory." ;;
esac
