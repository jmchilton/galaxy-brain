"""Rename only fixture outputs in memory, leaving Galaxy source untouched.

Run with the same framework environment plus strict history checks.
"""
from copy import deepcopy
import pytest
from galaxy.tool_util.parser.yaml import YamlToolSource
original_init=YamlToolSource.__init__
def renamed_fixture(self,root_dict,source_path=None):
    if root_dict.get('id')=='implicit_conversion_shared_input_y':
        root_dict=deepcopy(root_dict)
        for output in root_dict['outputs']:
            output['name']={'as_fasta':'as_fasta_out','as_tabular':'as_tabular_out'}.get(output['name'],output['name'])
        for test in root_dict['tests']:
            test['outputs']={{'as_fasta':'as_fasta_out','as_tabular':'as_tabular_out'}.get(name,name):definition for name,definition in test['outputs'].items()}
    original_init(self,root_dict,source_path)
YamlToolSource.__init__=renamed_fixture
if __name__=='__main__':
    raise SystemExit(pytest.main(['-p','no:cacheprovider','test/functional/test_toolbox_pytest.py','-k','implicit_conversion_shared_input_y','-m','tool','-q','--tb=short','--basetemp=/private/tmp/pr24004-framework-renamed']))
