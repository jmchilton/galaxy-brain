"""Prototype for test/unit/files/test_hal.py; passed 7/7 against 57bac72b9a2 (run in-tree, then removed)."""

import socket

import pytest
import responses

from galaxy.exceptions import MessageException, ObjectNotFound
from galaxy.files.sources import hal  # noqa: F401
from ._util import assert_realizes_as, configured_file_sources, user_context_fixture

API = "https://api.hal.science/search/"
REC = {
    "halId_s": "hal-01479142",
    "version_i": 2,
    "title_s": ["Bovine SVs"],
    "files_s": ["https://hal.science/hal-01479142/file/main.pdf"],
    "fileAnnexes_s": [
        "https://hal.science/hal-01479142/file/a%20b.xlsx",
        "https://evil.example/hal-01479142/file/x.txt",
        "http://hal.science/hal-01479142/file/plain.txt",
    ],
}


@pytest.fixture(autouse=True)
def public_dns(monkeypatch):
    real = socket.getaddrinfo

    def fake(host, *a, **k):
        if host in ("127.0.0.1", "localhost", "169.254.169.254"):
            return real(host, *a, **k)
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]

    monkeypatch.setattr(socket, "getaddrinfo", fake)


def _sources():
    return configured_file_sources([{"type": "hal", "id": "hal"}])


def _search(docs, n=None):
    responses.add(responses.GET, API, json={"response": {"docs": docs, "numFound": n if n is not None else len(docs)}})


def _src():
    return _sources().get_file_source_path("gxfiles://hal").file_source


@responses.activate
def test_root_lists_versioned_deposits_with_total():
    _search([REC], n=40)
    entries, total = _src().list("/", user_context=user_context_fixture(), limit=1, offset=0, query="title_t:RNA")
    assert [(e.name, e.path) for e in entries] == [("Bovine SVs (hal-01479142v2)", "/hal-01479142v2")]
    assert total == 40
    assert "q=title_t%3ARNA" in responses.calls[0].request.url


@responses.activate
def test_deposit_lists_only_hal_https_files_with_head_sizes():
    _search([REC])
    responses.add(responses.HEAD, "https://hal.science/hal-01479142v2/file/a%20b.xlsx", headers={"Content-Length": "555786"})
    responses.add(responses.HEAD, "https://hal.science/hal-01479142v2/file/main.pdf", status=500)
    entries, total = _src().list("/hal-01479142v2", user_context=user_context_fixture())
    assert [(e.name, e.size) for e in entries] == [("a b.xlsx", 555786), ("main.pdf", 0)]
    assert total == 2


@responses.activate
def test_realize_pins_version():
    _search([REC])
    responses.add(responses.GET, "https://hal.science/hal-01479142v2/file/main.pdf", body="pdf!")
    assert_realizes_as(_sources(), "gxfiles://hal/hal-01479142v2/main.pdf", "pdf!")


@responses.activate
def test_stale_version_refused():
    _search([REC])
    with pytest.raises(MessageException, match="different deposit version"):
        _src().list("/hal-01479142v1", user_context=user_context_fixture())


@responses.activate
def test_redirect_to_private_refused():
    _search([REC])
    responses.add(responses.GET, "https://hal.science/hal-01479142v2/file/main.pdf", status=302, headers={"Location": "http://169.254.169.254/latest"})
    responses.add(responses.GET, "http://169.254.169.254/latest", body="secret")
    with pytest.raises(Exception) as e:
        assert_realizes_as(_sources(), "gxfiles://hal/hal-01479142v2/main.pdf", "secret")
    assert "secret" not in str(e.value)
    assert len(responses.calls) == 2


def test_writable_rejected():
    with pytest.raises(ValueError, match="read-only"):
        configured_file_sources([{"type": "hal", "id": "hal", "writable": True}])


@responses.activate
def test_invalid_path():
    with pytest.raises(ObjectNotFound):
        _src().list("/not-a-record", user_context=user_context_fixture())
