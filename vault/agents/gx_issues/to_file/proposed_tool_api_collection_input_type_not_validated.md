# Collection input validation accepts types excluded by the tool's declaration

Collection parameter validation accepts directly supplied collections whose type does not match the tool's `collection_type` declaration, even when the tool form's matching rule excludes them.

On `dev` at [`557e7f327839`](https://github.com/galaxyproject/galaxy/commit/557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2), a focused reproduction submits `{"src": "hdca", "id": 1}` to `DataCollectionToolParameter.from_json()` and then calls `validate()` on the result:

| Input declares | Collection supplied | `HistoryQuery.direct_match()` | `from_json()` + `validate()` |
| --- | --- | --- | --- |
| `list` | `paired` | `False` | Accepted |
| `paired` | `list` | `False` | Accepted |
| `list` | `list:list` | `False` | Accepted as the whole collection |
| `list,list:paired` | `paired` | `False` | Accepted |
| `list` | `sample_sheet` | `True` | Accepted, as intended |
| `list` | `list` | `True` | Accepted, as intended |

These are direct values without a batch/map-over request. A nested collection that could be mapped over should not become a valid *direct* input merely because mapping is possible.

[`from_json()`](https://github.com/galaxyproject/galaxy/blob/557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2/lib/galaxy/tools/parameters/basic.py#L3042-L3113) resolves the supplied collection and checks for deleted inputs, but never checks its collection type. The inherited [`validate()`](https://github.com/galaxyproject/galaxy/blob/557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2/lib/galaxy/tools/parameters/basic.py#L2361-L2408) checks dataset validators and counts, but also leaves the collection type unchecked. The input therefore passes parameter validation with a structure the tool did not declare it can consume.

Expected: reject an incompatible direct collection during parameter validation with an error identifying the input, supplied type, and accepted types. Keep the existing compatibility rules, including a `sample_sheet` satisfying a `list` requirement, and preserve valid map-over requests and unrestricted collection inputs.

<details><summary>Focused reproduction and its limits</summary>

Run this from a Galaxy checkout with its Python dependencies installed and `PYTHONPATH=lib`. It uses real Galaxy parameter and collection objects. The session substitute only resolves the submitted collection ID.

```python
from types import SimpleNamespace
from galaxy import model
from galaxy.model.dataset_collections.query import HistoryQuery
from galaxy.model.dataset_collections.type_description import CollectionTypeDescriptionFactory
from galaxy.tools.parameters.basic import DataCollectionToolParameter
from galaxy.util import parse_xml_string

param = DataCollectionToolParameter(None, parse_xml_string(
    '<param name="input" type="data_collection" collection_type="list"/>'
))
collection = model.DatasetCollection(collection_type="paired")
for index, name in enumerate(["forward", "reverse"]):
    hda = model.HistoryDatasetAssociation(extension="txt", dataset=model.Dataset())
    hda.dataset.state = model.Dataset.states.OK
    model.DatasetCollectionElement(
        collection=collection, element=hda,
        element_index=index, element_identifier=name,
    )
hdca = model.HistoryDatasetCollectionAssociation(collection=collection, deleted=False)

class Session:
    def get(self, cls, key):
        assert cls is model.HistoryDatasetCollectionAssociation and key == 1
        return hdca

trans = SimpleNamespace(sa_session=Session(), security=None, workflow_building_mode=False)
query = HistoryQuery.from_parameter(param, CollectionTypeDescriptionFactory(None))
print("direct_match:", query.direct_match(hdca))  # False
value = param.from_json({"src": "hdca", "id": 1}, trans)
param.validate(value, trans)  # No error
print("accepted:", value is hdca)  # True
```

The table was produced using the same setup for each declared/supplied type. The executed `from_json()` and inherited `validate()` methods were checked against the pinned upstream source and have identical Python ASTs. This is a parameter-layer reproduction, not an HTTP submission or a completed tool run. It does not establish the eventual job outcome or workflow-invocation behavior.

</details>

## Context

Discovered while working on 🌿 [`issue_24303_collection_type_prefix_26.2`](https://github.com/jmchilton/galaxy/tree/issue_24303_collection_type_prefix_26.2), implementing 🎯 #24303. This concerns validation of the input's declared type, independently of that issue's output-type feature. 🎯 #24220 and 🔀 #24453 concern client drag-and-drop matching. They do not add server-side parameter validation for directly submitted collection types.
