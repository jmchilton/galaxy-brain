# planemo#1721 — Build and Target a Modern Galaxy Docker Image

[Issue](https://github.com/galaxyproject/planemo/issues/1721)

`planemo/options.py:617` defaults `--docker_galaxy_image` to the maintained `quay.io/bgruening/galaxy`, but `planemo/galaxy/config.py:1163` falls back to `bgruening/galaxy-stable` when the kwd is absent — Docker Hub, frozen at `20.09` since 2021-04-18. The one `docker_galaxy` test is skipped (`tests/test_cmd_test.py:185`, added by mvdbeek in `d6b222d4`, 2025-06-19); un-skipping it is the acceptance test.
