from json import loads
from pathlib import Path
import subprocess
from unittest.mock import patch

from galaxy import model
from galaxy.workflow import extract
from galaxy.workflow.modules import ConnectedInputName, ToolModule
from galaxy_test.api.test_workflow_extraction import _ExtractionHelpersMixin
from galaxy_test.api.test_workflows import BaseWorkflowsApiTestCase
from galaxy_test.base.workflow_assertions import WorkflowStructureAssertions


class TestIndependentSelectorVerification(_ExtractionHelpersMixin, BaseWorkflowsApiTestCase, WorkflowStructureAssertions):
    def test_historical_api_import_and_exact_parent_extraction(self):
        original_dummy = ToolModule.add_dummy_datasets
        skipped = []
        def historical_import(module, connections=None, steps=None):
            if connections and all(isinstance(c, ConnectedInputName) for c in connections):
                skipped.extend(c.input_name for c in connections)
                return
            return original_dummy(module, connections=connections, steps=steps)
        # Recreate only the pre-c0d329d5cb3 importer behavior. All connections are
        # imported through the API; no direct database insertion or edit.
        with patch.object(ToolModule, 'add_dummy_datasets', historical_import):
            workflow_id = self.workflow_populator.upload_yaml_workflow('''
class: GalaxyWorkflow
inputs:
  input: data
steps:
  parse:
    tool_id: param_value_from_file
    in:
      input1: input
    state:
      param_type: text
  consume:
    tool_id: output_filter_exception_1
    in:
      options|options: parse/text_param
    state:
      options:
        options: default
''')
        assert 'options|options' in skipped
        app = self.driver_or_skip_test_if_remote().server_wrappers[0].app
        with app.model.session() as session:
            stored = session.get(model.StoredWorkflow, app.security.decode_id(workflow_id))
            consumer = next(s for s in stored.latest_workflow.steps if s.label == 'consume')
            assert consumer.tool_inputs['options'] == {'__current_case__': 0, 'options': 'default'}
            (connection,) = consumer.input_connections
            assert connection.input_name == 'options|options'
            assert connection.output_name == 'text_param'
            assert connection.output_step.label == 'parse'
            print('VERIFICATION persisted API-imported edge and concrete selector: valid')
        with self.dataset_populator.test_history() as history_id:
            hda = self.dataset_populator.new_dataset(history_id, content='default', wait=True)
            self.workflow_populator.invoke_workflow_and_wait(workflow_id, history_id=history_id, inputs={'0': {'src':'hda', 'id':hda['id']}}, request={'allow_tool_state_corrections': True})
            jobs = self._get('jobs', {'history_id': history_id}).json()
            assert all(job['state'] == 'ok' for job in jobs), jobs
            job_ids = [self._job_id_for_tool(jobs, t) for t in ('param_value_from_file', 'output_filter_exception_1')]
            with app.model.session() as session:
                consumer_job = session.get(model.Job, app.security.decode_id(job_ids[1]))
                options = loads(next(p.value for p in consumer_job.parameters if p.name == 'options'))
                assert options == {'__current_case__': 0, 'options': 'default'}
                assert consumer_job.effective_workflow_invocation_step.workflow_step.input_connections[0].input_name == 'options|options'
                print('VERIFICATION source invocation jobs: all ok; recorded selector:', options)
            endpoints = [
                ('workflows', {'from_history_id': history_id, 'dataset_ids':[hda['hid']], 'job_ids':job_ids, 'workflow_name':'independent saved selector HID'}),
                ('workflows/extract', {'hda_ids':[hda['id']], 'job_ids':job_ids, 'workflow_name':'independent saved selector ID'}),
            ]
            head = []
            for endpoint, payload in endpoints:
                response = self._post(endpoint, data=payload, json=True)
                head.append(response.status_code)
                print('VERIFICATION HEAD', endpoint, response.status_code)
            parent_source = subprocess.check_output(['git','show','9008c8cb17c8fc4116e3afca7da707655349812d^:lib/galaxy/workflow/extract.py'], text=True)
            parent = {'__name__': 'galaxy.workflow.independent_parent_extract', '__package__':'galaxy.workflow'}
            exec(compile(parent_source, 'exact_parent_extract.py', 'exec'), parent)
            controls = []
            with patch.object(extract, 'extract_steps', parent['extract_steps']), patch.object(extract, 'extract_steps_by_ids', parent['extract_steps_by_ids']):
                for endpoint, payload in endpoints:
                    response = self._post(endpoint, data=payload, json=True)
                    controls.append(response.status_code)
                    print('VERIFICATION EXACT PARENT', endpoint, response.status_code)
            assert head == [500, 500]
            assert controls == [200, 200]
