# Iterating a multiple select in a tool command skips parameter sanitization

`#for $v in $multi_select` yields raw values because `SelectToolParameterWrapper.__iter__` returns `self.value`, while `str($multi_select)` and `InputValueWrapper.__iter__` sanitize; `group_tag` values (user tags) are the main exposure.
