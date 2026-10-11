"""Read-only probes; creates config/profile fixtures only under a temporary directory."""
import json
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import click
import importlib.metadata
from click.testing import CliRunner
from planemo import options
from planemo.cli import PlanemoCliContext, command_function
from planemo.config import planemo_option

results = []
def invoke(label, decorator, *, args=(), config="{}", profile=None):
    with tempfile.TemporaryDirectory(prefix="planemo-config-probe-") as directory:
        path = Path(directory)
        ctx = PlanemoCliContext()
        ctx.planemo_config = str(path / "config.yml")
        ctx.planemo_directory = str(path / "workspace")
        Path(ctx.planemo_config).write_text(config)
        if profile is not None:
            profile_path = Path(ctx.galaxy_profiles_directory) / "example"
            profile_path.mkdir()
            (profile_path / "planemo_profile_options.json").write_text(json.dumps({"engine": "docker_galaxy", **profile}))
            args = ["--profile", "example", *args]
        @click.command()
        @options.profile_option()
        @decorator
        @command_function
        def command(ctx, **kwds):
            click.echo(json.dumps({"galaxy_python_version": kwds.get("galaxy_python_version"), "checked": kwds.get("checked"), "port": kwds.get("port")}))
        result = CliRunner().invoke(command, args, obj=ctx)
        results.append({"label": label, "exit_code": result.exit_code, "output": result.output.strip(), "exception": type(result.exception).__name__ if result.exception else None})

# On #1714, model composing its conversion helper with #1704's actual choice list.
choices = ["3.8", "3.9", "3.10", "3.11", "3.12", "3.13", "3.14"]
def python_option():
    if sys.argv[2] == "1704":
        return options.galaxy_python_version()
    return planemo_option("--galaxy_python_version", use_global_config=True, default=None, type=click.Choice(choices))
invoke("python-cli-3", python_option(), args=["--galaxy_python_version", "3"])
invoke("python-global-3", python_option(), config="default_galaxy_python_version: '3'")
invoke("python-profile-3", python_option(), profile={"galaxy_python_version": "3"})
invoke("unknown-key", python_option(), config="default_galaxy_pyton_version: '3'")
invoke("invalid-unused-key", planemo_option("--port", default="9090", type=int, use_global_config=True), config="default_galaxy_python_version: 'banana'")
for name, data in [("list-root", "- default_galaxy_python_version: '3'"), ("scalar-root", "hello"), ("empty-root", "")]:
    invoke(name, python_option(), config=data)

def validate(ctx, param, value):
    if value == "bad":
        raise click.BadParameter("must not be bad", ctx=ctx, param=param)
    return value

def checked():
    return planemo_option("--checked", type=str, default="good", use_global_config=True, callback=validate)
invoke("callback-cli", checked(), args=["--checked", "bad"])
invoke("callback-global", checked(), config="default_checked: bad")
invoke("callback-profile", checked(), profile={"checked": "bad"})

@click.command()
@click.option("--version", type=click.Choice(["3.14"]), callback=validate)
def click_defaults(version):
    click.echo(version)
control = CliRunner().invoke(click_defaults, default_map={"version": "3"})
results.append({"label": "native-click-default-map-choice", "exit_code": control.exit_code, "output": control.output.strip()})
print(json.dumps({"source": sys.argv[1], "mode": sys.argv[2], "click_version": importlib.metadata.version("click"), "results": results}, indent=2))
