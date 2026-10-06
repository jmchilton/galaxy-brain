# galaxy#3899 — Interaction between dependencies and Docker is problematic.

[Issue](https://github.com/galaxyproject/galaxy/issues/3899)

Galaxy still resolves dependencies (costly with `auto_install`) for jobs that will run in a Docker container; next: check whether this still happens on dev.
