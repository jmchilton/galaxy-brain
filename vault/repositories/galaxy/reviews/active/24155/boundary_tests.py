import pytest
from galaxy_test.api.test_workflows import TestWorkflowsApi

class TestFilteredOutputReview(TestWorkflowsApi):
    @pytest.mark.parametrize('consumer,output,should_fail,expected', [
        ('cat1', 'out_1', True, None),
        ('multi_data_optional', 'does_not_exist', True, None),
        ('multi_data_optional', 'out_1', False, 'No input selected'),
        ('multi_data_optional', 'list_output', False, 'No input selected'),
    ])
    def test_review_filtered_boundaries(self, consumer, output, should_fail, expected):
        with self.dataset_populator.test_history() as history_id:
            summary = self._run_workflow(f'''class: GalaxyWorkflow
inputs: []
steps:
  producer:
    tool_id: output_filter
    state:
      produce_out_1: false
      filter_text_1: foo
  consumer:
    tool_id: {consumer}
    in:
      input1: producer/{output}
''', history_id=history_id, assert_ok=not should_fail)
            invocation = self.workflow_populator.get_invocation(summary.invocation_id)
            if should_fail:
                assert invocation['state'] == 'failed'
                assert invocation['messages'][0]['reason'] == 'output_not_found'
            else:
                assert invocation['state'] in ('scheduled', 'completed')
                content = self.dataset_populator.get_history_dataset_content(history_id)
                assert content.strip() == expected
