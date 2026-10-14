import ast
import json
import logging
import pathlib
import subprocess
import runpy
from collections import OrderedDict
from galaxy.datatypes.registry import example_datatype_registry_for_sample, Registry
from galaxy.managers.datatypes import get_preferred_visualization, view_mapping
from galaxy.util.bunch import Bunch
logging.disable(logging.CRITICAL)
root = pathlib.Path.cwd()
source = subprocess.check_output(['git', 'show', 'HEAD^:lib/galaxy/managers/datatypes.py'], text=True)
node = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == 'get_preferred_visualization')
from typing import Optional
ns = {'Registry': Registry, 'view_mapping': view_mapping, 'Optional': Optional}
exec(compile(ast.Module(body=[node], type_ignores=[]), '<exact-parent-function>', 'exec'), ns)
old = ns['get_preferred_visualization']
reg = example_datatype_registry_for_sample()
changes = {ext: {'before': old(reg, ext), 'after': get_preferred_visualization(reg, ext)} for ext in reg.datatypes_by_extension if old(reg, ext) != get_preferred_visualization(reg, ext)}
assert set(changes) == {'anvio_state', 'd3_hierarchy', 'freq.json', 'hivtrace', 'mzqc'}, changes
print('SAMPLE:', len(reg.datatypes_by_extension), 'extensions; changed:', json.dumps(changes, sort_keys=True))
tests = runpy.run_path('test/unit/app/managers/test_datatypes.py')
for name, fn in tests.items():
    if name.startswith('test_'):
        fn.__globals__['get_preferred_visualization'] = old
        try:
            fn()
        except AssertionError:
            print('EXACT PARENT:', name, 'FAILS')
        else:
            print('EXACT PARENT:', name, 'passes')
nearest = Registry()
nearest.datatypes_by_extension = {k:reg.datatypes_by_extension[k] for k in ['binary', 'h5', 'mbi']}
nearest.visualization_mappings = OrderedDict([('binary', {'visualization':'broad'}), ('h5', {'visualization':'near'})])
assert get_preferred_visualization(nearest, 'mbi') == {'visualization':'near'}
print('NEAREST ANCESTOR:', 'old=',old(nearest, 'mbi'), 'new=',get_preferred_visualization(nearest, 'mbi'))
config = pathlib.Path('/Users/jxc755/projects/worktrees/galaxy/pr/23869/lib/galaxy/config/sample/datatypes_conf.xml.sample')
context = Registry(Bunch(sniff_compressed_dynamic_datatypes_default=True))
context.load_datatypes(root_dir=str(root), config=str(config))
for ext in ['rrd', 'gwas_bgzip', 'hep.root', 'bai', 'tabix', 'gz', 'tar', 'tar.gz', 'fasta', 'fasta.gz', 'fasta.bz2']:
    print('23869 CONFIG:', ext, json.dumps({'before':old(context,ext),'after':get_preferred_visualization(context,ext)}))
for ext in ['hep.root', 'bai', 'tabix', 'gz', 'tar', 'tar.gz']:
    assert get_preferred_visualization(context,ext) is None
for ext, viz in [('rrd','rerunio'), ('gwas_bgzip','locuszoom'), ('fasta','alignment'), ('fasta.gz','alignment'), ('fasta.bz2','alignment')]:
    assert get_preferred_visualization(context,ext) == {'visualization':viz}
print('CONTEXT ASSERTIONS: all passed')
