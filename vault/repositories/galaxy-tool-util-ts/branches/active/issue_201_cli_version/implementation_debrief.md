# Implementation debrief

Root cause per issue: `spec/*.json` hard-coded `"version": "1.0.0"`. Fixed in `src/meta/specs.ts` by stamping from `package.json`, dropping the JSON field. Red test `test/program-version.test.ts`. Gate: `make check` green; `make test` green except the known gxwf-web `--output-schema` timeout under load (passes alone). Normal review and Codex review: no findings. Thermo review skipped (<50 lines).
