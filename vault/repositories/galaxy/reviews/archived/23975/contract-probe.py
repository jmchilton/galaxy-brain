"""Offline contracts through Galaxy and the installed nomad-fsspec 0.1.1 adapter."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import responses
from nomad_fsspec import NomadFileSystem
from yaml import safe_load

from galaxy.exceptions import AuthenticationRequired, MessageException, RequestParameterInvalidException
from galaxy.files import ConfiguredFileSources, ConfiguredFileSourcesConf
from galaxy.files.models import FileSourcePluginsConfig
from galaxy.files.sources.nomad import DEFAULT_NOMAD_URL, NomadFilesSource
from galaxy.files.templates.examples import get_example
from galaxy.files.templates.manager import raw_config_to_catalog
from galaxy.files.templates.models import template_to_configuration

API = f"{DEFAULT_NOMAD_URL}/api/v1"


def aggregation(*values):
    return {"aggregations": {"buckets": {"terms": {"data": [{"value": v} for v in values]}}}}


def directory(*items):
    return {"directory_metadata": {"content": list(items)}, "pagination": {"total": len(items)}}


def source():
    sources = ConfiguredFileSources(
        FileSourcePluginsConfig(listings_expiry_time=60),
        ConfiguredFileSourcesConf(conf_dict=[{"type": "nomad", "id": "nomad"}]),
    )
    plugin, rel_path = sources.get_file_source_path("gxfiles://nomad")
    assert isinstance(plugin, NomadFilesSource)
    return plugin


def run():
    template = raw_config_to_catalog(safe_load(get_example("production_nomad.yml"))).root[0]
    resolved = template_to_configuration(template, {}, {}, user_details={}, environment={})
    assert resolved.base_url == DEFAULT_NOMAD_URL
    print("production template parses and resolves")
    NomadFileSystem.clear_instance_cache()
    plugin = source()
    assert not plugin.get_writable()
    with responses.RequestsMock() as mock:
        mock.post(f"{API}/entries/query", json=aggregation("ds1", "ds2"))
        mock.get(f"{API}/datasets/", json={"data": [
            {"dataset_id": "ds1", "dataset_name": "Demo PUBLIC Data"},
            {"dataset_id": "ds2", "dataset_name": "Other"},
            {"dataset_id": "ds3", "dataset_name": "No public entries"},
        ], "pagination": {"total": 3}})
        entries, total = plugin.list(query=" demo public ", limit=1)
        assert total == 1 and [(e.name, e.uri) for e in entries] == [
            ("Demo PUBLIC Data", "gxfiles://nomad/ds1")
        ]
        entries, total = plugin.list(offset=1)
        assert total == 2 and [e.name for e in entries] == ["Other"]
        assert len(mock.calls) == 2, "listing reused the filesystem cache"
        print("display-name query, URI identity, pagination and cache reuse pass")
    NomadFileSystem.clear_instance_cache()
    with responses.RequestsMock() as mock:
        mock.get(f"{API}/uploads/up1/rawdir/", json=directory(
            {"name": "sub", "is_file": False, "size": 3},
            {"name": "a.txt", "is_file": True, "size": 3},
        ))
        mock.get(f"{API}/uploads/up1/rawdir/sub/", json=directory(
            {"name": "b.txt", "is_file": True, "size": 4},
        ))
        mock.get(f"{API}/uploads/up1/raw/a.txt", body=b"abc")
        entries, total = plugin.list("/ds1/up1", recursive=True)
        assert total == 3 and {e.path for e in entries} == {
            "/ds1/up1/sub", "/ds1/up1/a.txt", "/ds1/up1/sub/b.txt"
        }
        with TemporaryDirectory() as td:
            target = Path(td) / "download.txt"
            plugin.realize_to("/ds1/up1/a.txt", str(target))
            assert target.read_bytes() == b"abc"
        print("recursive non-root listing and exact file bytes pass")
    try:
        plugin.list(recursive=True)
    except RequestParameterInvalidException:
        print("recursive root listing refused")
    else:
        raise AssertionError("recursive root accepted")
    try:
        plugin.write_from("/ds1/up1/new", "unused")
    except Exception as e:
        assert "non-writable" in str(e)
        print("write refused before I/O")
    else:
        raise AssertionError("write accepted")
    NomadFileSystem.clear_instance_cache()
    with responses.RequestsMock() as mock:
        mock.get(f"{API}/uploads/up1/rawdir/", status=403, json={"detail": "Denied"})
        try:
            plugin.list("/ds1/up1")
        except AuthenticationRequired:
            print("explicit folder permission error remains visible")
        else:
            raise AssertionError("permission error hidden")
    with patch.object(NomadFilesSource, "required_module", None):
        try:
            source()
        except Exception as e:
            assert "nomad-fsspec" in str(e)
            print("missing optional dependency reports the correct package")
        else:
            raise AssertionError("missing dependency silently accepted")


if __name__ == "__main__":
    run()
