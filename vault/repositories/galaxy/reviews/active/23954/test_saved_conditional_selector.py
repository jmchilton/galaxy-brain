from galaxy import model
from galaxy.workflow import extract
from galaxy.workflow.steps import attach_ordered_steps
from galaxy_test.api.test_workflow_extraction import _ExtractionHelpersMixin
from galaxy_test.api.test_workflows import BaseWorkflowsApiTestCase
from galaxy_test.base.workflow_assertions import WorkflowStructureAssertions


class TestSavedConditionalSelectorExtraction(_ExtractionHelpersMixin, BaseWorkflowsApiTestCase, WorkflowStructureAssertions):
    def test_saved_conditional_selector_extraction(self):
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
    state:
      options:
        options: default
''')
        # Seed the ordinary persisted connection used by workflows saved before
        # the independent ConnectedValue-on-import change of 2026-09-28.
        app = self.driver_or_skip_test_if_remote().server_wrappers[0].app
        with app.model.session() as session:
            stored = session.get(model.StoredWorkflow, app.security.decode_id(workflow_id))
            steps = {step.label: step for step in stored.latest_workflow.steps}
            steps['consume'].add_connection('options|options', 'text_param', steps['parse'])
            attach_ordered_steps(stored.latest_workflow)
            session.commit()
        with self.dataset_populator.test_history() as history_id:
            hda = self.dataset_populator.new_dataset(history_id, content='default', wait=True)
            self.workflow_populator.invoke_workflow_and_wait(workflow_id, history_id=history_id, inputs={'0': {'src':'hda','id':hda['id']}}, request={'allow_tool_state_corrections': True})
            jobs = self._get('jobs', {'history_id': history_id}).json()
            job_ids = [self._job_id_for_tool(jobs, tool_id) for tool_id in ['param_value_from_file','output_filter_exception_1']]
            assert all(job['state'] == 'ok' for job in jobs), jobs
            responses = []
            endpoints = [
                ('workflows', {'from_history_id': history_id, 'dataset_ids': [hda['hid']], 'job_ids': job_ids, 'workflow_name': 'saved conditional HID probe'}),
                ('workflows/extract', {'hda_ids': [hda['id']], 'job_ids': job_ids, 'workflow_name': 'saved conditional ID probe'}),
            ]
            for endpoint, payload in endpoints:
                response = self._post(endpoint, data=payload, json=True)
                print('PR HEAD:', endpoint, response.status_code, response.text)
                responses.append(response.status_code)
            original = extract._connect_parameter_inputs
            try:
                extract._connect_parameter_inputs = lambda trans, job_steps: None
                controls = []
                for endpoint, payload in endpoints:
                    response = self._post(endpoint, data=payload, json=True)
                    print('NEW PASS DISABLED:', endpoint, response.status_code)
                    controls.append(response.status_code)
            finally:
                extract._connect_parameter_inputs = original
            assert controls == [200,200]
            assert responses == [200,200]
