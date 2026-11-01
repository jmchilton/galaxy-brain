# Codex review

Acted on the only finding, in `08b8c1e3f24`. Nothing was left unaddressed.

The brief gave Codex the issues and the diff range, without our reasoning or the earlier review findings. Codex read the changed files plus categories, context and common_util. It checked the emitter's output against PyYAML, and it did not run the test suites.

- **Confirmed: the YAML emitter missed some characters.** A multi-line long description containing U+2028 or U+2029 took the literal-block path, and so did one containing control characters like U+000B. PyYAML treats U+2028 and U+2029 as line breaks, so the file failed with `ScannerError` or `ReaderError`. `JSON.stringify` also leaves U+2028 and U+2029 raw in quoted strings.
  - Fix: `UNPRINTABLE` now covers C0 controls except TAB, LF and CR, plus U+2028 and U+2029. Matching values are escaped as `\uXXXX` and take the quoted path.
  - The test was red first.
  - An exhaustive throwaway round-trip passed: code points 0 to 0x2FFF plus U+FEFF, U+FFFE and U+FFFF, each in a single-line and a block position, 24,582 values. All parse back to the same value under PyYAML.

<details>

P2 correctness, `shedYml.ts:31`, confidence "certain". The literal-block guard misses U+2028 and U+2029, but the indentation code splits only on LF. PyYAML treats those characters as line breaks, which makes the `.shed.yml` invalid. The guard also misses control characters such as U+000B. Repro: a long description of `"text\nline more"` makes `yaml.safe_load` raise `ScannerError`, and `"text\nline\u000bmore"` makes it raise `ReaderError`.

</details>
