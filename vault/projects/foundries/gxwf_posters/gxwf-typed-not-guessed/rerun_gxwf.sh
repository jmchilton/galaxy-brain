#!/usr/bin/env bash
# Re-run gxwf over IWC rnaseq-pe and the two planted-typo copies; writes data/. Needs network on first run.
set -euo pipefail
cd "$(dirname "$0")"
DEPS="${DEPS:-/private/tmp/claude-503/gxwf-gxwf-typed-not-guessed-deps}"
IWC="${IWC:-$HOME/projects/repositories/iwc}"
IWC_REF="${IWC_REF:-23ccd9915}"
CLI=1.15.0
WF=workflows/transcriptomics/rnaseq-pe/rnaseq-pe.ga
mkdir -p "$DEPS/work" data
if [ "$("$DEPS/node_modules/.bin/gxwf" --version 2>/dev/null)" != "$CLI" ]; then
  (cd "$DEPS" && [ -f package.json ] || npm init -y >/dev/null
   cd "$DEPS" && npm_config_cache="$DEPS/npm-cache" npm install --no-audit --no-fund "@galaxy-tool-util/cli@$CLI")
fi
G="$DEPS/node_modules/.bin/gxwf"
W="$DEPS/work"
git -C "$IWC" show "$IWC_REF:$WF" > "$W/rnaseq-pe.ga"
FLAGS=(--connections --strict-structure --strict-state --cache-dir "$DEPS/tool-cache")
# 1. the receipt run: unmodified IWC file
"$G" validate "$W/rnaseq-pe.ga" "${FLAGS[@]}" --json > data/validate.json
"$G" validate "$W/rnaseq-pe.ga" "${FLAGS[@]}" > data/validate.txt
# full --strict also enforces the dict encoding; record its verdict (exit 2 expected on legacy .ga)
set +e; "$G" validate "$W/rnaseq-pe.ga" --connections --strict --cache-dir "$DEPS/tool-cache" > data/strict-encoding.txt 2>&1; echo "exit=$?" >> data/strict-encoding.txt; set -e
# 2. warm-cache wall time, 5 runs
: > data/timing.txt
for i in 1 2 3 4 5; do /usr/bin/time -p "$G" validate "$W/rnaseq-pe.ga" "${FLAGS[@]}" --json 2>&1 >/dev/null | awk '/^real/{print $2}' >> data/timing.txt; done
# 3. planted typos, one per copy
jq '.steps["21"].tool_state |= (fromjson | .pe_parameters.paired_end_status = "PE_fragment" | tojson)' "$W/rnaseq-pe.ga" > "$W/void-param.ga"
jq '.steps["18"].input_connections["singlePaired|input"].output_name = "out1"' "$W/rnaseq-pe.ga" > "$W/void-conn.ga"
"$G" validate "$W/void-param.ga" "${FLAGS[@]}" --json > data/void-param.json || true
"$G" validate "$W/void-conn.ga" "${FLAGS[@]}" --json > data/void-conn.json || true
# 4. one step's raw state string, for the Format 2 card
jq -r '.steps["21"].tool_state' "$W/rnaseq-pe.ga" > data/featurecounts-tool_state.txt
{ echo "cli=$("$G" --version)"; echo "iwc=$(git -C "$IWC" rev-parse --short=9 "$IWC_REF")"; echo "node=$(node --version)"; } > data/run-meta.txt
cat data/run-meta.txt data/timing.txt
# 5. repair stub: restore the one letter in the void-param copy and re-run (timed)
jq '.steps["21"].tool_state |= (fromjson | .pe_parameters.paired_end_status = "PE_fragments" | tojson)' "$W/void-param.ga" > "$W/void-param-fixed.ga"
"$G" validate "$W/void-param-fixed.ga" "${FLAGS[@]}" --json > data/repair.json
: > data/repair-timing.txt
for i in 1 2 3; do /usr/bin/time -p "$G" validate "$W/void-param-fixed.ga" "${FLAGS[@]}" --json 2>&1 >/dev/null | awk '/^real/{print $2}' >> data/repair-timing.txt; done
# 6. Format 2 typed slip: IWC chipseq-sr converted to Format 2, then MACS2 format BAM -> BAMX planted
CHIP=workflows/epigenetics/chipseq-sr/chipseq-sr.ga
git -C "$IWC" show "$IWC_REF:$CHIP" > "$W/chipseq-sr.ga"
"$G" convert "$W/chipseq-sr.ga" --compact --cache-dir "$DEPS/tool-cache" --output "$W/chipseq-sr.gxwf.yml" >/dev/null
SF=(--connections --strict --cache-dir "$DEPS/tool-cache")
"$G" validate "$W/chipseq-sr.gxwf.yml" "${SF[@]}" --json > data/bamx-fixed.json
sed 's/^\(  *\)format: BAM$/\1format: BAMX/' "$W/chipseq-sr.gxwf.yml" > "$W/chipseq-sr-bamx.gxwf.yml"
diff "$W/chipseq-sr.gxwf.yml" "$W/chipseq-sr-bamx.gxwf.yml" > data/bamx.diff || true
"$G" validate "$W/chipseq-sr-bamx.gxwf.yml" "${SF[@]}" --json > data/bamx.json || true
"$G" validate "$W/chipseq-sr-bamx.gxwf.yml" "${SF[@]}" > data/bamx.txt 2>&1 || true
# 7. same check over the whole IWC corpus (tool state only; validate-tree has no --connections). Slow on a cold cache.
if [ "${SKIP_TREE:-0}" != "1" ]; then
  rm -rf "$W/iwc-tree" && mkdir -p "$W/iwc-tree"
  git -C "$IWC" archive "$IWC_REF" workflows | tar -x -C "$W/iwc-tree"
  find "$W/iwc-tree" -name '*.ga' | while read -r f; do
    "$DEPS/node_modules/.bin/galaxy-tool-cache" populate-workflow "$f" --cache-dir "$DEPS/tool-cache" >/dev/null 2>&1 || echo "populate failed: $f" >&2
  done
  "$G" validate-tree "$W/iwc-tree/workflows" --json --cache-dir "$DEPS/tool-cache" > "$W/iwc-tree.json"
  jq '{command: "gxwf validate-tree workflows/ --json (after galaxy-tool-cache populate-workflow on each .ga)",
       workflows: (.workflows|length), errors: ([.workflows[]|select(.error!=null)]|length), summary,
       skipped: [.workflows[] | .path as $p | .results[]? | select(.status|startswith("skip")) | {path: $p, tool_id, status, errors}]}' \
    "$W/iwc-tree.json" > data/iwc-tree-summary.json
fi
