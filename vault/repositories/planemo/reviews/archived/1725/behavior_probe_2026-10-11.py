import contextlib
import subprocess
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import patch

import pytest
from galaxy.tool_util.verify.interactor import GalaxyInteractorApi
from planemo.galaxy.config import local_galaxy_config
from planemo.engine.galaxy import ExternalGalaxyEngine
from planemo.runnable import ExternalGalaxyToolTestCase, for_path
from tests.test_utils import create_test_context


@pytest.mark.parametrize('revision', ['base', 'head'])
@pytest.mark.parametrize('operation', ['input', 'output'])
@pytest.mark.parametrize('server_has_file', [False, True])
def test_real_input_output_resolution(revision, operation, server_has_file, tmp_path):
    engine_class = ExternalGalaxyEngine
    if revision == 'base':
        source = subprocess.check_output(['git', 'show', 'b8547ffde67eb0c88998a818dfbdd075327c1ead:planemo/engine/galaxy.py'], text=True)
        module = ModuleType('planemo.engine.baseline_galaxy')
        module.__package__ = 'planemo.engine'
        exec(compile(source, '<baseline_galaxy>', 'exec'), module.__dict__)
        engine_class = module.ExternalGalaxyEngine
    filename = 'unique_external_1725.txt'
    local_content = b'local external fixture\n'
    server_content = b'Galaxy server fixture wins\n'
    (tmp_path / filename).write_bytes(local_content)
    expected = server_content if server_has_file else local_content
    config = SimpleNamespace(galaxy_url='http://test.invalid', master_api_key='test-master', user_api_key='test-user')

    @contextlib.contextmanager
    def served(runnables):
        yield config

    calls = []
    outcome = []
    def get_response(self, path):
        calls.append(path)
        if path == 'version':
            return SimpleNamespace(json=lambda: {'version_major': '26.0'})
        assert 'test_data_download' in path
        return SimpleNamespace(status_code=200 if server_has_file else 404, content=server_content)

    def verify(tool_id, galaxy_interactor, **kwds):
        expect_error = revision == 'base' and not server_has_file
        def resolve():
            if operation == 'input':
                result = galaxy_interactor.remote_to_input({'fname': filename, 'ftype': 'txt', 'dbkey': '?', 'composite_data': []}, tool_id)
                assert Path(result['path']).read_bytes() == expected
            else:
                with patch.object(galaxy_interactor, '_GalaxyInteractorApi__dataset_fetcher', return_value=lambda hid: expected):
                    galaxy_interactor.verify_output_dataset('history', 'dataset', filename, {}, tool_id)
        if expect_error:
            with pytest.raises(AssertionError, match='Test (input|output) file'):
                resolve()
            outcome.append('missing')
        else:
            resolve()
            outcome.append('resolved')
        kwds['register_job_data']({'status': 'success'})

    tool = for_path('tests/data/tools/ok_external_test_data.xml')
    case = ExternalGalaxyToolTestCase(tool, 'external_test_data_copy', '1.0', 0, {})
    engine = engine_class(create_test_context(), test_data=str(tmp_path))
    with patch.object(engine, 'ensure_runnables_served', served), patch.object(GalaxyInteractorApi, '_get', get_response), patch('planemo.engine.galaxy.interactor.verify_tool', verify):
        results = engine._run_test_cases([case], 60)
    assert results[0]['data']['status'] == 'success'
    assert outcome == (['missing'] if revision == 'base' and not server_has_file else ['resolved'])
    assert len(calls) == 2
