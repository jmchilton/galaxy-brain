# Pulsar `default_file_action: none` crashes on extra files

Pulsar `none`/no-op `rewrite` actions make both extra-files hooks raise `TypeError` (composite and Directory inputs reproduced in integration tests on dev 18296103e03); recommend filing as-is ([proposal](proposal.md), [debrief](debrief.md)).
