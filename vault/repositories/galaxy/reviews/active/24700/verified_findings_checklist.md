- [x] P3 1: PR description no longer matches the code — says ValueError-only/narrow; code now catches `Exception` incl. decompression bombs
- [x] P3 2: Partial metadata on mid-`set_meta` failure — truncated GIF leaves width set, rest unset; fixed by assigning after all reads
- [x] P3 3: Bomb test hand-builds a PNG — use `MAX_IMAGE_PIXELS=1` on existing fixture
- [x] P3 4: New `log.warning` never asserted — add `caplog` checks

Other Actions:
