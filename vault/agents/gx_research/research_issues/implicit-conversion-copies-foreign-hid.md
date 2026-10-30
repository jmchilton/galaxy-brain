# Implicit conversions created in another history copy the parent's HID

- Area: lib/galaxy/model (HDA.copy_attributes), lib/galaxy/datatypes/data.py
- Found while: [[Component - Implicit Dataset Conversion]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`Data.convert_dataset` (`lib/galaxy/datatypes/data.py:922-935`) runs the converter with `set_output_hid=visible` (False for implicit conversions), so the target history allocates no HID. It then calls `attach_implicitly_converted_dataset` → `HistoryDatasetAssociation.copy_attributes` (`lib/galaxy/model/__init__.py:6393-6395`), which sets `new_dataset.hid = self.hid` (the parent's HID).

That is the intended "converted dataset shares the parent's HID" design, but it assumes the converted HDA lands in the parent's history. It often doesn't:

- Tool runs whose input HDA lives in another history convert into the job's target history.
- Callers that pass no `history=` convert into the request's current history (`actions/__init__.py:453-454`). Examples: custom build from FASTA, `/api/datasets/{id}/converted/{ext}`, and visualization data providers.

The hidden converted HDA then carries a HID that the target history never allocated. It may equal the HID of an unrelated dataset there. HID-keyed logic then sees an extra HDA under that HID, for example the data-parameter options grouping by HID (`lib/galaxy/tools/parameters/basic.py:2902-2913`) and HID-based workflow extraction and lookups.

## Evidence / repro

Code read only. Repro idea: with history B current, `GET /api/datasets/{fasta_in_A}/converted/len` from a browser session. Then list B's contents with `?v=dev&visible=false` and compare the converted HDA's `hid` with B's existing items.

## Suggested fix

In `copy_attributes`, copy the HID only when `new_dataset.history_id == self.history_id`; otherwise allocate a fresh hidden HID, or leave it unset. Alternatively, default conversions to the parent's history (see `implicit-conversion-no-history-callers.md`). Add a unit test for a cross-history conversion.

## Related

- [[Component - Workflow Extraction]] (HID-based extraction)
