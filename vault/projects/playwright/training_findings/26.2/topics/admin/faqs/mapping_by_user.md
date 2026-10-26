# topics/admin/faqs/mapping_by_user.md — 26.2, text review

GTN `45d4932d33`. Admin FAQ, no Galaxy UI.

- `mapping-by-user-user-object`: Dynamic-rule `user` is a `User` model (`jobs/mapper.py`), so `user == "alice"` is never true. `params['object_store_id']` itself is still honored (`_set_object_store_ids_*`).
