"""Reproduce invocation-output sampling without a Galaxy server or downloads."""
import json
import sys
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, sys.argv[1])
from planemo.galaxy import workflows


def dataset(identifier):
    return {"element_type": "hda", "element_identifier": identifier, "object": {"id": identifier, "file_ext": "txt"}}


def nested(identifier, elements):
    return {"element_type": "dataset_collection", "element_identifier": identifier, "object": {"collection_type": "paired", "elements": elements}}


cases = {
    "flat_list": ("list", [dataset("a"), dataset("b"), dataset("c")]),
    "list_paired": ("list:paired", [nested("sample1", [dataset("forward1"), dataset("reverse1")]), nested("sample2", [dataset("forward2"), dataset("reverse2")])]),
}
results = {}
for name, (collection_type, elements) in cases.items():
    downloads = []
    def download(dataset_id, **kwds):
        downloads.append({"dataset_id": dataset_id, **kwds})
    collection = {"collection_type": collection_type, "elements": elements}
    invocation = {"outputs": {}, "output_collections": {"results": {"id": "collection"}}, "inputs": {"0": {"src": "hdca", "id": "collection", "label": "input"}}, "input_step_parameters": {}}
    client = SimpleNamespace(
        invocations=SimpleNamespace(show_invocation=lambda invocation_id: invocation),
        dataset_collections=SimpleNamespace(show_dataset_collection=lambda collection_id: collection),
        datasets=SimpleNamespace(download_dataset=download),
    )
    with patch.object(workflows, "gi", return_value=client):
        output = workflows.output_stubs_for_workflow("invocation", from_invocation=True, galaxy_url="https://example.invalid", galaxy_user_key="placeholder")
        production_downloads = list(downloads)
        downloads.clear()
        job = workflows.job_template("invocation", from_invocation=True, galaxy_url="https://example.invalid", galaxy_user_key="placeholder")
        input_downloads = list(downloads)
    downloads.clear()
    sampled = workflows._elements_to_test_def(elements, "test-data/results", download, definition_style="output")
    assert len(production_downloads) == (3 if name == "flat_list" else 4)
    assert len(input_downloads) == len(production_downloads)
    assert len(downloads) == 1
    results[name] = {"generated_outputs": output, "production_output_download_count": len(production_downloads), "production_output_downloads": production_downloads, "canonical_output_mode": sampled, "canonical_output_download_count": len(downloads), "input_download_count": len(input_downloads), "generated_job": job}
print(json.dumps({"source": sys.argv[1], "results": results}, indent=2))
