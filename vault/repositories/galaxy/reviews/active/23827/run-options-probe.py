"""Run from the reviewed Galaxy root with PYTHONPATH=lib and its test virtualenv."""
if __name__ == "__main__":
    import importlib.util
    from pathlib import Path
    import types
    import pytest

    class ReviewProbe:
        def pytest_collection_modifyitems(self, items):
            spec = importlib.util.spec_from_file_location("review_options_probe", Path(__file__).with_name("test-options-probe.py"))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for item in items:
                item.obj = types.MethodType(module.TestOptionsProbe.test_options_probe, item.instance)

    raise SystemExit(pytest.main(["-p", "no:cacheprovider", "test/integration/test_galaxy_link_import.py::TestGalaxyLinkImportIntegration::test_a_dataset_keeps_its_type_genome_build_and_tags", "-v", "-s", "--tb=short"], plugins=[ReviewProbe()]))
