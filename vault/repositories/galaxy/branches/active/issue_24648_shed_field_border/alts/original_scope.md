# Alt: original_scope

Branch `issue_24648_shed_field_border_alt_original_scope` (at `132b1ec8a9c`) is the first, narrower fix. It drops shed.css's `#bbc0d2` border override on inputs and its `#8992b2` hover rule, and gives the Quasar select border grey-500.

Compared with the parent branch, it doesn't add a shared darker hover border, doesn't resolve the focus-rule question or its comments, and keeps the `textarea.g-form-input` selector. The scope evaluation recommended doing those things (Scope B).
