"""Repro for #23522 P2 3 / P3 1: forwarded handler vs worker-side job config.

Copy to test/unit/app/jobs/test_forwarded_handler_repro.py on pr_23522_review_0 and run with pytest.
"""

from unittest import mock

import pytest

from galaxy.exceptions import ToolExecutionError
from galaxy.jobs.manager import JobManager
from galaxy.model import Job

from .test_job_configuration import BaseJobConfXmlParserTestCase


class TestForwardedHandler(BaseJobConfXmlParserTestCase):
    def _enqueue(self, job_handler):
        self.app.job_config = self.job_config
        tool = mock.Mock(id="cat1")
        tool.get_configured_job_handler.return_value = None
        job = Job()
        JobManager(self.app).enqueue(job, tool=tool, flush=False, job_handler=job_handler)
        return job.handler

    # P2 3: handler ID resolved on web side, unknown to worker config
    def test_unknown_forwarded_handler_db_preassign_fails(self):
        self._with_handlers_config(assign_with="db-preassign", handlers=[{"id": "worker_main"}])
        with pytest.raises(ToolExecutionError):
            self._enqueue("vgp_handler")

    def test_unknown_forwarded_handler_db_self_fails(self):
        self._with_handlers_config(assign_with="db-self", handlers=[{"id": "worker_main"}])
        with pytest.raises(ToolExecutionError):
            self._enqueue("vgp_handler")

    def test_unknown_forwarded_handler_db_skip_locked_stores_tag(self):
        self._with_handlers_config(assign_with="db-skip-locked", handlers=[{"id": "worker_main"}])
        assert self._enqueue("vgp_handler") == "vgp_handler"

    # P3 1: default_handler_id forwarded as configured
    def test_db_self_default_forwarded_preassigns(self):
        self._with_handlers_config(
            assign_with="db-self", default="pool", handlers=[{"id": "h1", "tags": "pool"}, {"id": "h2", "tags": "pool"}]
        )
        assert self._enqueue(None) == "main"
        assert self._enqueue("pool") in ("h1", "h2")

    def test_mem_self_default_forwarded_warns(self):
        self._with_handlers_config(assign_with="mem-self", default="h1", handlers=[{"id": "h1"}])
        with mock.patch("galaxy.web_stack.handlers.log") as log:
            self._enqueue("h1")
        assert "Ignoring handler assignment" in log.warning.call_args[0][0]
