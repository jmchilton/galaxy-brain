# galaxy#23930 — Tool Shed: repository update puts the long description in the short description

[Issue](https://github.com/galaxyproject/galaxy/issues/23930)

Branch `issue_23930_shed_update_descriptions` — Tool Shed `PUT /api/repositories/{id}` (e.g. `planemo shed_update`) wrote the long description into the short one and never set the long one; regression from the 2.0 FastAPI endpoint (`1a7e5d1df9f`, 2024-08, first in 24.2) — it passed API `synopsis`/`description` straight to `update_validated_repository` (model `description`/`long_description`), while the deleted v1 controller had mapped them since 2015; fix maps fields in the endpoint like `create_repository`; new API test red→green, `test_admin_can_manage` switched to `synopsis=` (John OK'd; it encoded the bug). State: one commit on `release_26.1` `1f85950f4a1`, pushed to `jmchilton`, **no PR**.
