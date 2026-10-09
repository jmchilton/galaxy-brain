# galaxy #23899 - [26.1] Fix MP3 fallback misclassifying UTF-16 uploads

- PR: https://github.com/galaxyproject/galaxy/pull/23899 (mvdbeek, draft, base `release_26.1`)
- Head reviewed: `a09b886a41e2c0407271519b1926ac5f77f068df`
- Fixes: #22644 (UTF-16 LE BOM TSV sniffed as `mp3` when `ffprobe` is absent)
- Worktree: `~/projects/worktrees/galaxy/pr/23899`
- Size: +49/-26, `lib/galaxy/datatypes/media.py` + new `test/unit/data/datatypes/test_media.py`

## Verdict

Approve (once out of draft). Small, correct, right layer for a release fix, with a real red-to-green
regression test.

## How the bug is reached

- `Mp3` is `Binary` (via `Audio`); `sniff.py:751` skips any sniffer whose `is_binary` disagrees with
  the file's `FilePrefix.binary`. A UTF-16 file contains NULs, so `is_binary` -> true and only binary
  sniffers run. Text sniffers never see it; the text path is not involved.
- Among binary sniffers, `Mp3` comes early in `datatypes_conf.xml.sample` (line ~1512). Without
  `ffprobe`, `Mp3.sniff` falls back to `_get_file_format_from_magic_number`, whose list included every
  `FF Ex`/`FF Fx` prefix (11-bit frame sync only), so `FF FE` (UTF-16 LE BOM) matched.
- So the fix belongs in the MP3 magic list, not in generic binary/text detection. Transcoding UTF-16
  to UTF-8 on upload would be a feature (and `convert_newlines` is byte-level), not a 26.1 fix - the PR
  body says so explicitly.

## Findings (ranked)

1. **Fix is correct.** Byte 2 of an MPEG audio header is `111VVLLP`. Kept prefixes:
   `E2/E3` = MPEG 2.5 L-III, `F2/F3` = MPEG 2 L-III, `FA/FB` = MPEG 1 L-III, each with CRC on/off.
   Reserved version (`VV=01`) and Layer I/II are dropped. `FF FE` decodes as MPEG1 Layer I w/ CRC, so
   it is excluded. ID3 (`49 44 33`) retained.
2. **Other UTF-16/32 text is not claimed by any other binary sniffer.** Probed the full sample
   registry with `ffprobe` disabled: UTF-16 LE/BE (with and without BOM) and UTF-32 LE/BE (with BOM),
   94 different leading chars each -> all 564 sniff as `binary` on head. No sibling magic sniffer (e.g.
   `mpg` `00 00 01 Bx`) catches them.
3. **Minor fallback vs ffprobe divergence (not blocking).** ffmpeg's `mp3` demuxer also reads MPEG
   Layer I/II streams and reports `format_name` `mp3`, so a bare MP2/MP1 stream would likely be `mp3`
   with ffprobe but `binary` without it after this change. (Not verified locally - no ffprobe.) Galaxy
   has no `mp2` datatype, and calling MP2 "mp3" was never really correct, so this is fine. At most worth
   one sentence in the PR body.
4. **False negatives on real MP3s - no new ones in practice.** Real MP3 files start with ID3v2 or a
   Layer III frame header, both still matched. Files that start with padding or junk before the first
   frame, or with APE/other tags, already failed the 2-byte prefix check before this PR. Only shipped
   fixture (`audio_2.mp3`) is ID3-prefixed, so frame-sync coverage is the synthetic 4-byte headers - ok.
5. **Tests are meaningful.** `test_utf16_upload_is_not_mp3` goes through
   `handle_uploaded_dataset_file_internal` with the issue's exact bytes, with and without POSIX newline
   conversion, and asserts bytes untouched. The 32-case header matrix pins the exact accepted set
   (Layer III only, reserved version rejected). `test_mp3_fallback_fixture` overlaps the `Mp3`
   doctests but forces the fallback path, which the doctests don't when ffprobe is installed - keep it.
   Imports at top; no typing concerns.

Nit-level, skip: none worth raising.

## Tests run

- Head: `PYTHONPATH=lib pytest test/unit/data/datatypes/test_media.py` -> 36 passed;
  `--doctest-modules lib/galaxy/datatypes/media.py` -> 4 passed. (ffprobe not installed locally, so
  the fallback path is what runs.)
- Red check: head tests against `origin/release_26.1` `media.py` -> both `test_utf16_upload_is_not_mp3`
  cases fail, plus every non-Layer-III header case. Green on head.
- Ad hoc probe of UTF-16/32 variants through `guess_ext` with sample registry: all `binary`.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

(Only behavior change: on servers without ffprobe, binary uploads starting with an MPEG Layer I/II
or reserved-version frame header now sniff as `binary` instead of `mp3`; trivially revertible.)

## Draft review comment

> _Posted by Claude (AI assistant) on behalf of jmchilton._
>
> Looks good. I checked the bit math: the six kept prefixes are exactly MPEG 1/2/2.5 Layer III with
> and without CRC, and `FF FE` decodes as MPEG 1 Layer I, so it drops out. The MP3 magic list is the
> right place for this on a release branch: UTF-16 is already (correctly) detected as binary, so only
> binary sniffers run, and `Mp3` was the one claiming it.
>
> I confirmed the new upload test fails against `release_26.1` and passes here. I also ran UTF-16 LE/BE
> (BOM and no BOM) and UTF-32 LE/BE text with 94 different leading characters through `guess_ext` on
> the sample registry with ffprobe disabled. All of them came back as `binary`, so no other magic
> sniffer picks these up.
>
> One small note, not blocking: ffmpeg's `mp3` demuxer also reads Layer I/II streams, so a bare MP2
> file would probably still sniff as `mp3` when ffprobe is installed and `binary` without it. That
> seems fine since Galaxy has no `mp2` type; it might be worth a sentence in the description.
