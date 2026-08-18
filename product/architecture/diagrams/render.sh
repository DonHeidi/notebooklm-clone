#!/usr/bin/env sh
# Renders every .puml in this directory to ../assets/<name>.svg using the
# official PlantUML container (bundles Java + Graphviz — neither joins the
# repo toolchain; Docker is already required for `supabase start`).
#
# The .puml files are the canonical sources; the SVGs are committed
# artifacts. Re-run this after editing a diagram and commit both.
set -eu
cd "$(dirname "$0")/.."
docker run --rm -v "$PWD:/work" plantuml/plantuml:latest \
  -tsvg -o /work/assets /work/diagrams
echo "rendered:"
ls -1 assets/*.svg
