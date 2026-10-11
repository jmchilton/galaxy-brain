"""Review probe: historical external API and persisted table XML, without a server."""
import ast
import subprocess
import tempfile
from pathlib import Path
from xml.etree.ElementTree import ElementTree, fromstring, tostring

from galaxy.model.tool_shed_install import ToolShedRepository
from galaxy.tool_shed.tools.data_table_manager import ShedToolDataTableManager
from galaxy.tool_shed.unittest_utils import StandaloneInstallationTarget
from galaxy.tool_util.data import ToolDataTableManager
from galaxy.tool_util.data.bundles.models import RepoInfo
from galaxy.util import Element, SubElement
from tool_shed.tools.data_table_manager import ToolDataTableManager as LegacyImport


def method_bodies(source):
    cls = next(n for n in ast.parse(source).body if isinstance(n, ast.ClassDef) and n.name == "ShedToolDataTableManager")
    return {n.name: ast.dump(ast.Module(body=n.body, type_ignores=[]), include_attributes=False) for n in cls.body if isinstance(n, ast.FunctionDef)}


source_file = "lib/galaxy/tool_shed/tools/data_table_manager.py"
historical = subprocess.check_output(["git", "show", f"4e711c5f634^:{source_file}"], text=True)
current = Path(source_file).read_text()
for name in ("generate_repository_info_elem", "generate_repository_info_elem_from_repository"):
    assert method_bodies(historical)[name] == method_bodies(current)[name], name
print("PASS: restored runtime method bodies match pre-removal implementation")

parent = subprocess.check_output(["git", "show", f"HEAD^:{source_file}"], text=True)
namespace = {"__name__": "review_baseline"}
exec(compile(parent, "review_baseline", "exec"), namespace)
assert not hasattr(namespace["ShedToolDataTableManager"], "generate_repository_info_elem_from_repository")
print("PASS: parent revision lacks the externally called helper")

with tempfile.TemporaryDirectory(prefix="pr24043-compat-") as directory:
    root = Path(directory)
    manager = ShedToolDataTableManager(StandaloneInstallationTarget(root))
    repo = ToolShedRepository(tool_shed="toolshed.g2.bx.psu.edu", name="data_manager_manual", owner="iuc", installed_changeset_revision="f7b5ea5d11d7")
    assert LegacyImport is ShedToolDataTableManager
    unattached = manager.generate_repository_info_elem_from_repository(repo)
    assert unattached.tag == "tool_shed_repository"
    table = Element("table", name="review_table")
    attached = manager.generate_repository_info_elem_from_repository(repo, parent_elem=table, description="A & B < γ")
    assert table.find("tool_shed_repository") is attached
    assert len(table) == 1
    assert fromstring(tostring(attached)).findtext("description") == "A & B < γ"
    print("PASS: historical import alias, empty-parent attachment, extra-field XML escaping")
    SubElement(table, "columns").text = "value, name, path"
    loc = root / "review.loc"
    loc.write_text("review-id\tReview entry\t/references/example.fa\n")
    SubElement(table, "file", path=str(loc))
    tables = Element("tables")
    tables.append(table)
    config = root / "tables.xml"
    ElementTree(tables).write(config, encoding="utf-8")
    registry = ToolDataTableManager(str(root), config)
    source = RepoInfo(tool_shed=repo.tool_shed, name=repo.name, owner=repo.owner, installed_changeset_revision=repo.installed_changeset_revision)
    assert registry["review_table"].get_filename_for_source(source) == str(loc)
    assert registry["review_table"].get_fields() == [["review-id", "Review entry", "/references/example.fa"]]
    registry.reload_tables()
    assert registry["review_table"].get_filename_for_source(source) == str(loc)
    assert registry["review_table"].get_fields() == [["review-id", "Review entry", "/references/example.fa"]]
    print("PASS: generated repository XML is consumed correctly by real table load and reload")
