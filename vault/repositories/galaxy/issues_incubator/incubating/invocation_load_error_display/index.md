# Failed store loads show `Error: ` before the server message

Cached store fetch failures surface the `Error` object, and `catch` blocks waiting on them never run. **Recommendation:** post; the review left only fix-side notes.
