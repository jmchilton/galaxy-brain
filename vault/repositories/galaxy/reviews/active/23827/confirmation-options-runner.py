if __name__ == '__main__':
    import importlib.util
    import types
    import pytest
    from pathlib import Path

    class Confirmation:
        def pytest_collection_modifyitems(self, items):
            spec = importlib.util.spec_from_file_location('independent_policy', Path(__file__).with_name('confirmation-options-probe.py'))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for item in items:
                item.obj = types.MethodType(module.check_policy_parity, item.instance)

    raise SystemExit(pytest.main(['-p', 'no:cacheprovider', 'test/integration/test_galaxy_link_import.py::TestGalaxyLinkImportIntegration::test_a_dataset_keeps_its_type_genome_build_and_tags', '-v', '-s', '--tb=short'], plugins=[Confirmation()]))
