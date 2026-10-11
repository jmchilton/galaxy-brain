from decimal import Decimal
from types import SimpleNamespace
from galaxy.datatypes.registry import example_datatype_registry_for_sample
from galaxy.model import DatasetCollection,DatasetCollectionElement,HistoryDatasetAssociation,HistoryDatasetCollectionAssociation,ImplicitlyConvertedDatasetAssociation,set_datatypes_registry
from galaxy.tools.runtime import setup_for_runtimeify
from galaxy.tool_util.parameters.convert import runtimeify
from galaxy.tool_util.parameters.state import JobInternalToolState
from galaxy.tool_util_models.parameters import DataCollectionRequestInternal,DatasetCollectionElementReference,DataParameterModel,ToolParameterBundleModel
registry=example_datatype_registry_for_sample();set_datatypes_registry(registry)
def hda(id,extension):
    d=HistoryDatasetAssociation(create_dataset=True,flush=False,name=f'input{id}',extension=extension);d.id=id;d.dataset.file_size=Decimal(4);return d
original=hda(1,'csv');converted=hda(2,'tabular')
ImplicitlyConvertedDatasetAssociation(parent=original,dataset=converted,file_type='tabular')
class Compute:
    def input_path_rewrite(self,d):return f'/job/inputs/{d.id}.dat'
    def input_extra_files_rewrite(self,d):return f'/job/inputs/{d.id}_files'
collection=DatasetCollection(collection_type='list')
element=DatasetCollectionElement(collection=collection,element_identifier='sample1',element_index=0,element=original);element.id=10
hdca=HistoryDatasetCollectionAssociation(collection=collection,name='inputs');hdca.id=20
_,adapt,adapt_collection=setup_for_runtimeify(SimpleNamespace(datatypes_registry=registry),Compute(),{'direct':original,'converted':converted},{'collection':hdca,'element':element})
result=adapt(DatasetCollectionElementReference(src='dce',id=10),['tabular'])
assert result.path=='/job/inputs/2.dat' and result.element_identifier=='sample1'
print('DCE dataset conversion and identifier: PASS')
result=adapt_collection(DataCollectionRequestInternal(src='hdca',id=20),'list',['tabular'])
assert result.elements[0].path=='/job/inputs/2.dat' and result.elements[0].element_identifier=='sample1'
print('HDCA conversion and element identifier: PASS')
outer=DatasetCollection(collection_type='list:list')
sub=DatasetCollectionElement(collection=outer,element_identifier='group',element_index=0,element=collection);sub.id=30
_,_,adapt_sub=setup_for_runtimeify(SimpleNamespace(datatypes_registry=registry),Compute(),{'direct':original,'converted':converted},{'subcollection':sub})
result=adapt_sub(DataCollectionRequestInternal(src='dce',id=30),'list',['tabular'])
assert result.elements[0].path=='/job/inputs/2.dat' and result.name=='group'
print('DCE subcollection conversion: PASS')
parameters=ToolParameterBundleModel(parameters=[DataParameterModel(type='data',name='multiple',multiple=True,extensions=['tabular']),DataParameterModel(type='data',name='optional',optional=True,extensions=['tabular'])])
state=JobInternalToolState({'multiple':[{'src':'hda','id':1},{'src':'hda','id':1}],'optional':None})
result=runtimeify(state,parameters,adapt,adapt_collection).input_state
assert all(d['path']=='/job/inputs/2.dat' for d in result['multiple']) and result['optional'] is None
print('Multiple dataset conversion and optional None: PASS')
