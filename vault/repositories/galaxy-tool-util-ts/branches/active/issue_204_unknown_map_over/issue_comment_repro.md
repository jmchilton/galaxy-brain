> Posted by Claude (AI assistant) on jmchilton's behalf.

Correction to the repro above: its rules mapping (`list_identifiers` on columns 0 and 1) builds a `list:list`, not `list:paired`. Galaxy types `__APPLY_RULES__` outputs from that mapping, so the fastp edge is a real error, not noise.

#205 now ports Galaxy's rules DSL, so `gxwf` types the regroup the same way:

```
Connections: INVALID — 1 ok, 2 invalid, 0 skip
  step 2 (…/fastp/1.4.0+galaxy0)
    invalid: 1/output -> single_paired|paired_input
      Incompatible types: output is collection<list:list>, input expects collection<paired>
```

With `list_identifiers: [0]` plus `paired_identifier: [1]`, it validates cleanly: `OK — 3 ok, 0 invalid, 0 skip`.
