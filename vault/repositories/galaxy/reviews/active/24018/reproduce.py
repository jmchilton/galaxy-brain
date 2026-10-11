"""Reproduce three non-sensitive PR #24018 review findings.

Usage (from the reviewed Galaxy worktree, with its Python dependencies installed):
    PYTHONPATH=lib python reproduce.py /path/to/worktree /path/to/real/conda/bin/activate

Environment creation uses the PR's fake executable and temporary directories.
The first probe uses actual Conda activation with tiny shell commands, not foreign
architecture binaries. The other probes use real Galaxy resolver/wrapper methods.
All assertions document the observed faulty behavior, rather than expected fixes.
"""
import importlib.util, pathlib, tempfile, os, subprocess, json, shutil, sys
root=pathlib.Path(sys.argv[1])
activate=sys.argv[2]
spec=importlib.util.spec_from_file_location('multiplatform_tests',root/'test/unit/tool_util/test_conda_multiplatform.py'); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
from galaxy.jobs.platform_routing import platform_destination
from galaxy.tool_util.deps.requirements import ToolRequirements
from galaxy.util.bunch import Bunch
with tempfile.TemporaryDirectory(prefix='pr24018-probe-') as td:
 p=pathlib.Path(td); fake=m.FakeConda(td); resolver=m.make_resolver(fake,p,platforms='linux-aarch64'); dm=resolver.dependency_manager
 for name in ('samtools','bwa'):
  m.install_conda_target(m.CondaTarget(name,version='1.0'),resolver.conda_context)
  env=pathlib.Path(m.foreign_env(fake,'linux-aarch64',f'__{name}@1.0'))
  exe=env/'bin'/name; exe.write_text('#!/bin/sh\necho '+name+'\n'); exe.chmod(0o755)
 reqs=ToolRequirements([m.req('samtools'),m.req('bwa')]); tool=Bunch(requirements=reqs,id='two_requirements'); app=Bunch(toolbox=Bunch(dependency_manager=dm))
 print('available',dm.platforms_for_requirements(reqs)); print('routing',platform_destination(app,tool,Bunch(id=1),{'arm':'linux-aarch64','x86':'linux-64'}))
 dependencies=dm.requirements_to_dependencies(reqs,platform='linux-aarch64',return_null=True)
 print('resolved',[(req.name,type(dep).__name__,dep.environment_path) for req,dep in dependencies.items()])
 # Use actual Conda activation while retaining generated explicit foreign environment paths.
 for dep in dependencies.values(): dep.activate=activate
 commands='\n'.join(dep.shell_commands() for dep in dependencies.values())
 r=subprocess.run(['/bin/bash','-c',commands+'\nsamtools\nsamtools_status=$?\nbwa\nbwa_status=$?\necho statuses:$samtools_status,$bwa_status'],cwd=td,text=True,capture_output=True)
 print('activation result',r.returncode,r.stdout,r.stderr)
 assert 'statuses:127,0' in r.stdout, r.stdout + r.stderr
from galaxy.jobs import MinimalJobWrapper
from galaxy.tools import Tool
from galaxy.tool_util.deps.resolvers.tool_shed_packages import ToolShedPackageDependencyResolver
from galaxy.jobs.job_destination import PlatformDependencyError
from types import MethodType
with tempfile.TemporaryDirectory(prefix='pr24018-context-') as td:
 p=pathlib.Path(td); fake=m.FakeConda(td); resolver=m.make_resolver(fake,p,platforms='linux-aarch64'); dm=resolver.dependency_manager
 shed=ToolShedPackageDependencyResolver(dm); dm.dependency_resolvers.insert(0,shed)
 path=p/'deps'/'bwa'/'1.0'/'owner'/'repo'/'revision'; (path/'bin').mkdir(parents=True)
 installed=Bunch(name='bwa',type='package',version='1.0',tool_shed_repository=Bunch(owner='owner',name='repo',installed_changeset_revision='revision'))
 app=Bunch(toolbox=Bunch(dependency_manager=dm)); tool=Bunch(id='contextual',version='1',requirements=ToolRequirements([m.req('bwa')]),app=app,installed_tool_dependencies=[installed],tool_dir=td,containers=[],requires_galaxy_python_environment=False)
 tool.build_dependency_shell_commands=MethodType(Tool.build_dependency_shell_commands,tool)
 wrapper=Bunch(app=app,tool=tool,working_directory=td,platform='linux-64',job_destination=Bunch(id='native',params={'platform':'linux-64'}),_dependency_shell_commands=None)
 wrapper._destination_runs_container=MethodType(MinimalJobWrapper._destination_runs_container,wrapper)
 wrapper._check_platform_dependencies=MethodType(MinimalJobWrapper._check_platform_dependencies,wrapper)
 print('native tool shell commands',tool.build_dependency_shell_commands(job_directory=td,platform='linux-64'))
 try: print('native wrapper commands',MinimalJobWrapper.dependency_shell_commands.fget(wrapper))
 except PlatformDependencyError as e: print('native wrapper error',e)
 else: raise AssertionError('Expected the context-free native check to reject the valid Tool Shed dependency')
 # A bare foreign job with no installed requirements bypasses its guard when only Docker is enabled.
 tool.installed_tool_dependencies=[]; wrapper.platform='linux-aarch64';wrapper.job_destination.params={'platform':'linux-aarch64','docker_enabled':True};wrapper._dependency_shell_commands=None
 commands=MinimalJobWrapper.dependency_shell_commands.fget(wrapper)
 print('container-enabled but unresolved bare commands',commands)
 assert commands == []
