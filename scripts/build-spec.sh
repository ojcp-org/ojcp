#!/usr/bin/env bash
# Build the OJCP specification into a site directory.
#
#   scripts/build-spec.sh <repo-dir> <out-dir>
#
# Core goes to <out-dir>/index.html and each extension to <out-dir>/<name>/index.html.
# Release tags before 0.4 hold a single spec/ojcp-v0.1.bs, which is built as core only.
set -euo pipefail

src="${1:?repo dir}"
out="${2:?output dir}"
mkdir -p "$out"

if [[ -f "$src/spec/ojcp.bs" ]]; then
  bikeshed --die-on=warning spec "$src/spec/ojcp.bs" "$out/index.html"
  for ext in trust mandates verification; do
    mkdir -p "$out/$ext"
    bikeshed --die-on=warning spec "$src/spec/ojcp-$ext.bs" "$out/$ext/index.html"
  done
else
  bikeshed spec "$src/spec/ojcp-v0.1.bs" "$out/index.html"
fi
