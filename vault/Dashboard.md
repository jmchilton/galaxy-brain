
Component Research
```dataview

TABLE status, revised, revision

FROM #research/component

WHERE status != "archived"

SORT revised DESC

```

Merged Pull Request Research
```dataview

TABLE status, revised, revision

FROM #research/pr

WHERE status != "archived"

SORT revised DESC

```

Issues
```dataview

TABLE status, revised, revision

FROM #research/issue

WHERE status != "archived"

SORT revised DESC

```
Plans
```dataview

TABLE status, revised, revision

FROM #plan 

WHERE status != "archived"

SORT revised DESC

```
