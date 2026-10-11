from decimal import Decimal
from types import SimpleNamespace
from galaxy.datatypes.registry import example_datatype_registry_for_sample
from galaxy.model import HistoryDatasetAssociation,ImplicitlyConvertedDatasetAssociation,set_datatypes_registry
from galaxy.tools.runtime import setup_for_runtimeify
from galaxy.tool_util.parameters.convert import runtimeify
from galaxy.tool_util.parameters.state import JobInternalToolState
from galaxy.tool_util_models.parameters import DataParameterModel,ToolParameterBundleModel
registry=example_datatype_registry_for_sample();set_datatypes_registry(registry)
def hda(dataset_id,extension):
    d=HistoryDatasetAssociation(create_dataset=True,flush=False,name='input',extension=extension)
    d.id=dataset_id;d.dataset.file_size=Decimal(4)
    return d
original=hda(1,'fasta');converted=hda(2,'tabular')
ImplicitlyConvertedDatasetAssociation(parent=original,dataset=converted,file_type='tabular')
class Compute:
    def input_path_rewrite(self,d): return f'/job/inputs/dataset_{d.id}.dat'
    def input_extra_files_rewrite(self,d): return f'/job/inputs/dataset_{d.id}_files'
_,adapt,adapt_collection=setup_for_runtimeify(SimpleNamespace(datatypes_registry=registry),Compute(),{'as_fasta':original,'as_tabular':converted})
parameters=ToolParameterBundleModel(parameters=[DataParameterModel(type='data',name='as_fasta',extensions=['fasta']),DataParameterModel(type='data',name='as_tabular',extensions=['tabular'])])
state=JobInternalToolState({'as_fasta':{'src':'hda','id':1},'as_tabular':{'src':'hda','id':1}})
result=runtimeify(state,parameters,adapt,adapt_collection).input_state
print({key:{'format':data['format'],'path':data['path']} for key,data in result.items()})
assert result['as_fasta']['format']=='fasta'
assert result['as_tabular']['format']=='tabular', 'Tabular input incorrectly resolves to original FASTA'
