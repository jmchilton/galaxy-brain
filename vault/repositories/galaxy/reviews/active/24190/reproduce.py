
from pathlib import Path
from types import SimpleNamespace as NS
from sqlalchemy.orm import Session
from galaxy import model
from galaxy.tools import NestTool
from galaxy.tool_util.parser.factory import get_tool_source
from galaxy.model.dataset_collections import registry, type_description, query, structure

source = get_tool_source('lib/galaxy/tools/nest_collection.xml')
outputs = source.parse_outputs(None)[1]
output = outputs['output']
print('XML output type:', output.structure.collection_type)
session = Session()
history = model.History()
flat = model.DatasetCollection(collection_type='list')
paired_list = model.DatasetCollection(collection_type='list:paired')
pair = model.DatasetCollection(collection_type='paired')
for i, name in enumerate(['forward', 'reverse']):
    hda = model.HistoryDatasetAssociation(history=history)
    model.DatasetCollectionElement(collection=pair, element=hda, element_index=i, element_identifier=name)
model.DatasetCollectionElement(collection=paired_list, element=pair, element_index=0, element_identifier='sample')
session.add_all([flat, paired_list])
class Capture:
    def create_collection(self, output, name, **kw):
        self.kw = kw
        self.effective_type = kw.get('collection_type') or output.structure.collection_type
fake_tool = NS(outputs={'output': output}, _add_datasets_to_history=lambda history, elements: None)
for collection in [flat, paired_list, model.DatasetCollection(collection_type='list:paired')]:
    capture = Capture()
    NestTool.produce_outputs(fake_tool, None, {}, capture, {'input': NS(collection=collection)}, history)
    print(f'Nest {collection.collection_type} ({len(collection.elements)} elements): {capture.effective_type}')
factory = type_description.CollectionTypeDescriptionFactory(registry.DatasetCollectionTypesRegistry())
q = query.HistoryQuery.from_collection_types(['list', 'list:paired'], factory)
old_q = query.HistoryQuery.from_collection_types(['list', 'paired'], factory)
for label, q_ in [('before', old_q), ('after', q)]:
    print(f'bare paired {label}: direct={q_.direct_match(NS(collection=pair))}, map={bool(q_.can_map_over(NS(collection=pair)))}')
manager = NS(collection_type_descriptions=factory)
tree = structure.tool_output_to_structure(None, output, manager)
print('Predicted per-job output type for mapping:', tree.collection_type_description.collection_type)
mapping = structure.UninitializedTree(factory.for_collection_type('list'))
print('Predicted mapped output type for list:list:paired input:', mapping.multiply(tree).collection_type_description.collection_type)
print('Expected actual mapped structure: list:list:list:paired')
