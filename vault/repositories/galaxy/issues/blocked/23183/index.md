# galaxy#23183 — Feature Request: Pre-initialize popular interactive tools for fast startup

[Issue](https://github.com/galaxyproject/galaxy/issues/23183)

Request to keep a warm pool of pre-initialized interactive tool instances so Jupyter/RStudio start in seconds; blocked on: startup performance metrics — John and mvdbeek both want to know which part of startup is actually slow before breaking Galaxy's permission, database, and job communication model for a pool, and bgruening measures ~30s warm starts on EU against the reported "several minutes", so the premise is environment-specific. mschatz wants all options kept open.
