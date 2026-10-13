import inspect
import textwrap
import pytest
import galaxy.jobs as jobs

def main():
    source=textwrap.dedent(inspect.getsource(jobs.MinimalJobWrapper._set_unknown_output_extensions_to_data))
    old='not extension\n            or extension == "auto"'
    assert old in source
    source=source.replace(old, '(extension == "auto" and dataset_assoc.dataset.state == Dataset.states.DEFERRED)')
    ns=dict(vars(jobs))
    exec(compile(source,'<isolated-extension-control>','exec'),ns)
    jobs.MinimalJobWrapper._set_unknown_output_extensions_to_data=ns['_set_unknown_output_extensions_to_data']
    return pytest.main(['test/functional/test_toolbox_pytest.py','-m','tool','-k','empty_ext or auto_ext','-q','--tb=short'])

if __name__ == '__main__':
    raise SystemExit(main())
