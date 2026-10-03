Read ./show_me.md for the upstream rules. The local rules below take precedence.

## Status markers judge outcomes

- A marker (✅ ❌ ⚠️ …) says whether a result is what we want, not whether an operation succeeded. A lookup that works when it shouldn't is not ✅, and a check that correctly rejects something is not ❌.
- Give each marker one meaning across the whole table or document. If a column mixes "worked" with "desired", split it or reword it.
- Use a separate marker for "works but shouldn't" (e.g. 😬) when a bug is a success the system shouldn't allow.
- When markers aren't plain pass/fail, put a one-line legend above the table.
- Markers are for rows whose outcome is in question. Leave control or reference rows (expected behavior shown for comparison) unmarked and describe them in words, e.g. "rejected as intended".
