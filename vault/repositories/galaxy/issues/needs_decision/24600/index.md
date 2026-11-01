# galaxy#24600 — Pulsar jobs with `default_file_action: none` fail when a tool uses extra files

[Issue](https://github.com/galaxyproject/galaxy/issues/24600)

Pulsar `none`/no-op `rewrite` actions make both extra-files hooks raise `TypeError` (composite and Directory inputs reproduced in integration tests on dev 18296103e03); recommend filing as-is ([proposal](proposal.md), [debrief](debrief.md)).
