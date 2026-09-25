## Overview

Replace the Perl script in the script-wrapping documentation with a small Python 3 equivalent. This is a fresh implementation of the idea proposed in #705.

## Differences from #705

The earlier implementation received useful review feedback but was never updated. This version:

- explicitly uses Python 3;
- counts uppercase and lowercase GC bases;
- preserves the original script's ratio-only, three-decimal output format; and
- handles a final FASTA sequence line without a trailing newline.

The surrounding documentation and example Galaxy tool now reference the Python script.

## Verification

- Smoke-tested the script with uppercase, lowercase, and multiline FASTA records.
- Confirmed that all records produce the expected three-decimal output.
- Ran Black's formatting check on the replacement script.
