# Creating a FASTA custom build through the API always 500s for API-key clients (no current history)

`PUT /api/users/{user_id}/custom_builds/{key}` with `{"len|type": "fasta", "len|value": <hda id>}` returns `500 {"err_msg": "Failed to convert dataset.", "err_code": 500004}` for any API-key request, even with an `ok` FASTA dataset the user owns and a server whose datatypes ship `fasta_to_len` / `len_to_linecount` (stock `datatypes_conf.xml.sample` does). The UI works only because a browser session has a current history.

## Cause (release_26.2 `e2649e52818`; same code on dev)

- `lib/galaxy/webapps/galaxy/api/users.py` 578-579 call `dataset.get_converted_dataset(trans, "len")` and `new_len.get_converted_dataset(trans, "linecount")` with no `history=`.
- `get_converted_dataset` -> `Data.convert_dataset(..., history=None)` -> `converter.execute(trans, ..., history=None)`, so the tool action falls back to `trans.history`, which is `None` for API-key requests.
- `lib/galaxy/tools/actions/__init__.py:533` `assert history` raises a bare `AssertionError`. The `except Exception` in `users.py` 582-583 turns it into `ToolExecutionError("Failed to convert dataset.")`. That's the same swallowing as `custom_build_conversion_error_swallowed` (`custom_build_no_converter_400_26.0` narrows the `except` to `NoConverterException`, so there this `AssertionError` surfaces as an unhandled 500 with a traceback instead).
- Sibling path that does it right: tool-input implicit conversion, `tools/actions/__init__.py` 212-218, passes `history=history`.
- Possibly the same omission (unverified): `services/datasets.py:984` `_get_or_create_converted` and `:1063` also call `get_converted_dataset(trans, ...)` without `history=`.

## Likely fix

Pass both `get_converted_dataset` calls a `history=` owned by the requesting user (e.g. their current history, falling back to their most recent one). Two arguments. For session requests that matches today's behavior.

## Red test (written and run on `custom_build_from_fasta`, then reverted; fails on 500 today)

```diff
diff --git a/lib/galaxy_test/api/test_users.py b/lib/galaxy_test/api/test_users.py
index 08cd06d72a0..801d8620f93 100644
--- a/lib/galaxy_test/api/test_users.py
+++ b/lib/galaxy_test/api/test_users.py
@@ -633,6 +633,24 @@ class TestUsersApi(ApiTestCase):
         current_user = self._get(url).json()
         assert specified_user == current_user
 
+    def test_custom_build_from_fasta(self):
+        dataset_populator = DatasetPopulator(self.galaxy_interactor)
+        user_id = dataset_populator.user_id()
+        with dataset_populator.test_history() as history_id:
+            hda = dataset_populator.new_dataset(
+                history_id, content=">chr1\nACGT\n>chr2\nAC\n", file_type="fasta", wait=True
+            )
+            response = self._put(
+                f"users/{user_id}/custom_builds/fasta_build",
+                data={"name": "FASTA build", "len|type": "fasta", "len|value": hda["id"]},
+                json=True,
+            )
+            self._assert_status_code_is(response, 200)
+            dataset_populator.wait_for_history(history_id)
+            builds = self._get(f"users/{user_id}/custom_builds").json()
+            build = next(build for build in builds if build["id"] == "fasta_build")
+            assert build["count"] == 2
+
     def __url(self, action, user):
         return self._api_url(f"users/{user['id']}/{action}", params=dict(key=self.master_api_key))
 
```

Placed after `test_show_current` in `lib/galaxy_test/api/test_users.py`, to stay clear of the hunks that `custom_build_no_converter_400_26.0` and #24310 add.

## Context / knock-on

- Found while doing the scope work for `custom_build_from_fasta` (E2E coverage for GTN FAQ `analysis_add_custom_build`, base `release_26.2`). That branch keeps the E2E only, because this test can't go green without a product fix.
- Blocks the planned red API test in #24309 (not listed until reload), which goes through the same PUT.
- The #24310 / `better_custom_build_error_handling_25.1` debrief says no owner happy-path API test exists "because the test datatypes couldn't convert FASTA". That's wrong: API tests use the stock datatypes, and the real blocker is this bug.
- Related: 🔀 #24310, 🎯 #24309, branch `custom_build_no_converter_400_26.0`.
