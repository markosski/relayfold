#!/usr/bin/env sh
set -eu

install_dir="${RELAYFOLD_INSTALL_DIR:-$HOME/.local/bin}"
source_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
install_ref="${RELAYFOLD_INSTALL_REF:-main}"
raw_base="${RELAYFOLD_RAW_BASE:-https://raw.githubusercontent.com/markosski/relayfold/$install_ref}"

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

install_packaging_file rf "$install_dir/rf" 755
install_packaging_file build-images.sh "$install_dir/build-images.sh" 755
install_packaging_file docker-compose.release.yml "$install_dir/docker-compose.release.yml" 644

ln -sf rf "$install_dir/relayfold"

echo "Installed rf to $install_dir/rf"
echo "Installed relayfold compatibility alias at $install_dir/relayfold"
case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) echo "Add $install_dir to PATH to run rf from any directory." ;;
esac
