# Pulsar `default_file_action: none` crashes on extra files; sample job_conf staging docs are wrong

With `none` (or a no-op `rewrite`), `PulsarComputeEnvironment.input_extra_files_rewrite` / `output_extra_files_rewrite` pass `None` into `dataset_path_to_extra_path` and raise `TypeError`; also rolls in `job_conf.sample.yml` file-action doc drift. Reproduced in a unit test on dev 7761eeb.
