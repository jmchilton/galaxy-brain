"""Run from the PR worktree with the shared venv and PYTHONPATH=lib."""
from pathlib import Path
import os
import tempfile
import pytest

with tempfile.TemporaryDirectory(prefix="pr24005-shared-fixture-") as temporary:
    config = Path(temporary) / "tool_conf.xml"
    fixture = Path(__file__).with_name("shared-input.yml").resolve()
    config.write_text(f'<toolbox><tool file="{fixture}" /></toolbox>')
    os.environ["GALAXY_TEST_TOOL_CONF"] = f"test/functional/tools/sample_tool_conf.xml,{config}"
    os.environ["GALAXY_TEST_RAISE_EXCEPTION_ON_HISTORYLESS_HDA"] = "1"
    raise SystemExit(pytest.main(["-p", "no:cacheprovider", "test/functional/test_toolbox_pytest.py", "-k", "pr24005_shared_input", "-m", "tool", "-q", "--tb=short", "--basetemp=/private/tmp/pr24005-framework-shared-reproduce"]))
