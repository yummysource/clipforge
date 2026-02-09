#!/bin/bash
# ============================================================
# bump-version.sh — Unified version management
# ============================================================
# Uses package.json as the single source of truth, syncs to:
#   - src-tauri/tauri.conf.json
#   - src-tauri/Cargo.toml
#
# Usage:
#   ./scripts/bump-version.sh <patch|minor|major|x.y.z>
#
# Examples:
#   ./scripts/bump-version.sh patch    # 0.1.2 -> 0.1.3
#   ./scripts/bump-version.sh minor    # 0.1.2 -> 0.2.0
#   ./scripts/bump-version.sh major    # 0.1.2 -> 1.0.0
#   ./scripts/bump-version.sh 2.0.0    # Set explicit version
# ============================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PKG_JSON="$ROOT_DIR/package.json"
TAURI_CONF="$ROOT_DIR/src-tauri/tauri.conf.json"
CARGO_TOML="$ROOT_DIR/src-tauri/Cargo.toml"

# Read current version from package.json
CURRENT=$(grep -o '"version": *"[^"]*"' "$PKG_JSON" | head -1 | grep -o '[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*')

if [ -z "$CURRENT" ]; then
  echo "Error: failed to read version from package.json"
  exit 1
fi

# Parse argument
BUMP="${1:-}"
if [ -z "$BUMP" ]; then
  echo "Current version: $CURRENT"
  echo ""
  echo "Usage: $0 <patch|minor|major|x.y.z>"
  exit 0
fi

# Calculate new version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  patch)
    NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
    ;;
  minor)
    NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
    ;;
  major)
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
  *)
    # Validate x.y.z format
    if [[ ! "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Error: invalid version '$BUMP' (expected x.y.z or patch/minor/major)"
      exit 1
    fi
    NEW_VERSION="$BUMP"
    ;;
esac

echo "Bumping version: $CURRENT -> $NEW_VERSION"
echo ""

# 1. Update package.json
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$PKG_JSON"
echo "  Updated package.json"

# 2. Update tauri.conf.json
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$TAURI_CONF"
echo "  Updated src-tauri/tauri.conf.json"

# 3. Update Cargo.toml (match version = "x.y.z" at line start)
sed -i '' "s/^version = \"$CURRENT\"/version = \"$NEW_VERSION\"/" "$CARGO_TOML"
echo "  Updated src-tauri/Cargo.toml"

echo ""
echo "All versions synced to $NEW_VERSION"
