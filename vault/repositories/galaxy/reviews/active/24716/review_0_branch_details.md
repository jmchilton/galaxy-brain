`pr_24716_review_0` starts from the reviewed commit `79c6aac67bb` and only changes the PR's new tests. It moves their repeated preference setup into a helper and replaces the tool filter's position check with a comparison of the filters the preference added.

- `14b1a7b7b58` Share filter preference test setup, compare only added tool filters: adds `trans_with_filter_preferences(factory)` to `test_toolbox_filters.py` and makes the allowed-filters test fail if the tool filter is loaded twice.
