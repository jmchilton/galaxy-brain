"""Throwaway repro: which input path strings does a tool see on an embedded Pulsar destination?"""

import base64
import os
import re

from galaxy_test.base.populators import (
    DatasetCollectionPopulator,
    DatasetPopulator,
)
from galaxy_test.driver import integration_util

REPRO_DIR = os.path.abspath(os.path.dirname(__file__))
TEST_DATA = os.path.abspath(os.path.join(REPRO_DIR, "..", "..", "..", "test-data"))


def _job_config(rewrite_parameters: bool):
    return {
        "runners": {
            "local": {"load": "galaxy.jobs.runners.local:LocalJobRunner"},
            "pulsar_embed": {
                "load": "galaxy.jobs.runners.pulsar:PulsarEmbeddedJobRunner",
                "pulsar_app_config": {
                    "tool_dependency_dir": "none",
                    "conda_auto_init": False,
                    "conda_auto_install": False,
                },
            },
        },
        "execution": {
            "default": "pulsar_embed",
            "environments": {
                "local": {"runner": "local"},
                "pulsar_embed": {
                    "runner": "pulsar_embed",
                    "default_file_action": "copy",
                    "rewrite_parameters": rewrite_parameters,
                },
            },
        },
        "tools": [{"id": "__DATA_FETCH__", "environment": "local"}],
    }


class _Base(integration_util.IntegrationTestCase):
    framework_tool_and_types = True
    rewrite_parameters: bool

    def setUp(self):
        super().setUp()
        self.dataset_populator = DatasetPopulator(self.galaxy_interactor)
        self.dataset_collection_populator = DatasetCollectionPopulator(self.galaxy_interactor)

    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        conf_dir = cls._test_driver.mkdtemp()
        tool_conf = os.path.join(conf_dir, "tool_conf.xml")
        with open(tool_conf, "w") as f:
            f.write(f'<toolbox tool_path="{REPRO_DIR}"><tool file="collection_paths_echo.xml"/></toolbox>')
        config["tool_config_file"] = tool_conf
        config["job_config"] = _job_config(cls.rewrite_parameters)
        config["object_store_store_by"] = "uuid"
        config["outputs_to_working_directory"] = False
        config["cleanup_job"] = "never"

    def test_paths(self):
        with open(os.path.join(TEST_DATA, "1.bam"), "rb") as fh:
            bam_url = "base64://" + base64.b64encode(fh.read()).decode()
        with self.dataset_populator.test_history() as history_id:
            fetch = self.dataset_populator.fetch(
                {
                    "history_id": history_id,
                    "targets": [
                        {
                            "destination": {"type": "hdca"},
                            "collection_type": "list",
                            "name": "bams",
                            "elements": [
                                {"src": "url", "url": bam_url, "ext": "bam", "name": "e1"},
                                {"src": "url", "url": bam_url, "ext": "bam", "name": "e2"},
                            ],
                        },
                        {
                            "destination": {"type": "hdas"},
                            "elements": [{"src": "url", "url": bam_url, "ext": "bam", "name": "single"}],
                        },
                    ],
                },
                wait=True,
            ).json()
            hdca = fetch["output_collections"][0]
            single = [o for o in fetch["outputs"] if o.get("name") == "single"][0]
            run = self.dataset_populator.run_tool(
                "collection_paths_echo",
                {"input1": {"src": "hdca", "id": hdca["id"]}, "single": {"src": "hda", "id": single["id"]}},
                history_id,
            )
            self.dataset_populator.wait_for_job(run["jobs"][0]["id"], assert_ok=True)
            content = self.dataset_populator.get_history_dataset_content(history_id, dataset=run["outputs"][0])
        print(f"\n===== rewrite_parameters={self.rewrite_parameters} =====\n{content}\n=====")
        report = os.environ.get("REPRO_REPORT")
        if report:
            with open(report, "a") as f:
                f.write(f"===== rewrite_parameters={self.rewrite_parameters} =====\n{content}\n")
        lines = {k: v.split() for k, v in (line.split(":", 1) for line in content.splitlines() if ":" in line)}
        staged = os.path.join(lines["JOB_DIRECTORY"][0], "..", "inputs")
        staged = os.path.normpath(staged) + os.sep
        # Controls: wrappers that go through the compute environment see Pulsar staged paths.
        for key in ("FOR_LOOP", "COLL_FOR_METADATA_PARAM", "SINGLE", "SINGLE_METADATA_PARAM", "SINGLE_SERIALIZE_SOURCE"):
            assert all(p.startswith(staged) for p in lines[key]), (key, lines[key])
        # Accessors under test should agree with their per-element counterparts.
        problems = []
        for key, expected in (
            ("ALL_PATHS", "FOR_LOOP"),
            ("COLL_SERIALIZE_SOURCE", "FOR_LOOP"),
            ("COLL_ALL_METADATA_FILES", "COLL_FOR_METADATA_PARAM"),
            ("COLL_SERIALIZE_METADATA", "COLL_FOR_METADATA_PARAM"),
            ("SINGLE_ALL_METADATA_FILES", "SINGLE_METADATA_PARAM"),
            ("SINGLE_SERIALIZE_METADATA", "SINGLE_METADATA_PARAM"),
        ):
            if lines[key] != lines[expected]:
                problems.append(f"{key}={lines[key]} != {expected}={lines[expected]}")
        assert not problems, "\n".join(problems)


class TestCollectionPathsRewriteParameters(_Base):
    rewrite_parameters = True
