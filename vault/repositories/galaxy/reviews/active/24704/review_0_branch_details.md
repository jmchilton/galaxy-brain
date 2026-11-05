`pr_24704_review_0` is based on the reviewed head `8c28063331f`. It rewords the new `stored_string_is_single_option` comment to say that wrapping stored strings bypasses the base `_select_from_json` whitespace split. It makes no behavior change.

- `af36dd1882e` Note stored select strings skip base whitespace split. Rewords the class-attribute comment in `lib/galaxy/tools/parameters/basic.py` so it doesn't imply only subclasses split stored strings.
