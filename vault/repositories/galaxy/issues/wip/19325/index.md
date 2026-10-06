# galaxy#19325 — TestsCaseValidation: `""` not allowed for optional selects? 

[Issue](https://github.com/galaxyproject/galaxy/issues/19325)

`TestsCaseValidation` rejects `""` for optional selects; resolved in discussion as `value_json="null"` (bernt-matthias); next: improve the XSD/docs so tool developers learn the `value_json="null"` form.
