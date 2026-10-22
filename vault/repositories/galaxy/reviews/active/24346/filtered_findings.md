# Filtered findings — galaxy#24346

- **default P3 3: the `ApiKey` description still tells the model to ask the user for a key.** Filtered because it re-argues a decision the PR description states explicitly: the schema description and `connect` docstring tell the model to omit the key and only ask for one if a call fails with "API key required".
