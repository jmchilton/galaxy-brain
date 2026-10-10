"""Independent cache invariants for Galaxy PR 24017; no service or network required."""
import gc
import os
import random
import threading
import weakref
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from galaxy.tool_util.deps.container_resolvers import mulled
from galaxy.tool_util.deps.container_resolvers.explicit import CachedExplicitSingularityContainerResolver
from galaxy.tool_util.deps.dependencies import AppInfo, ToolInfo
from galaxy.tool_util.deps.requirements import ContainerDescription


def main():
    with TemporaryDirectory(prefix="pr24017-") as directory:
        path = Path(directory)
        for name in ("foo:1.0--0", "foo:1.0--1", "mulled-v1-aaa:0", "mulled-v2-bbb:ccc-0"):
            (path / name).touch()
        first = mulled.DirMtimeCacheDirectory(str(path))
        second = mulled.DirMtimeCacheDirectory(str(path / "."))
        assert first._listing is second._listing

        # Release eight simultaneous readers only after they are ready, and hold
        # the actual listdir until the coordinator observes a build in progress.
        original_listdir = os.listdir
        ready = threading.Barrier(9)
        building = threading.Event()
        release = threading.Event()
        def slow_listdir(directory):
            building.set()
            assert release.wait(5)
            return original_listdir(directory)
        def read():
            ready.wait(timeout=5)
            return first.list_cached_mulled_images_from_path()
        with patch.object(os, "listdir", side_effect=slow_listdir) as listdir:
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = [executor.submit(read) for _ in range(8)]
                ready.wait(timeout=5)
                assert building.wait(5)
                release.set()
                results = [future.result(timeout=5) for future in futures]
            assert listdir.call_count == 1
            assert all(result is results[0] for result in results)
        print("PASS concurrent readers share one build and one list")

        # Force an unchanged mtime to exercise explicit invalidation instead of
        # allowing the automatic directory-mtime refresh to mask its behavior.
        mtime = path.stat().st_mtime
        (path / "qux:3.0--0").touch()
        os.utime(path, (mtime, mtime))
        second.invalidate_cache()
        rebuilt = first.list_cached_mulled_images_from_path()
        assert rebuilt is second.list_cached_mulled_images_from_path()
        assert "qux:3.0--0" in [image.image_identifier for image in rebuilt]
        print("PASS invalidate from one resolver refreshes another at unchanged mtime")

        v1 = mulled.DirMtimeCacheDirectory(str(path), hash_func="v1")
        assert v1._listing is not first._listing
        assert any(isinstance(image, mulled.CachedV1MulledImageMultiTarget) for image in v1.list_cached_mulled_images_from_path())
        assert not any(isinstance(image, mulled.CachedV2MulledImageMultiTarget) for image in v1.list_cached_mulled_images_from_path())
        assert not any(isinstance(image, mulled.CachedV1MulledImageMultiTarget) for image in rebuilt)
        print("PASS hash function isolates both shared state and parsed targets")

        # Capture an old listing, then change the directory while rebuilding it.
        # The subsequent read must rebuild rather than bless the old list with
        # the post-build timestamp.
        first.invalidate_cache()
        def change_during_listing(directory):
            captured = original_listdir(directory)
            if not (path / "later:1.0--0").exists():
                (path / "later:1.0--0").touch()
                changed_mtime = path.stat().st_mtime + 10
                os.utime(path, (changed_mtime, changed_mtime))
            return captured
        with patch.object(os, "listdir", side_effect=change_during_listing) as listdir:
            old = first.list_cached_mulled_images_from_path()
            new = first.list_cached_mulled_images_from_path()
            assert listdir.call_count == 2
            assert "later:1.0--0" not in [image.image_identifier for image in old]
            assert "later:1.0--0" in [image.image_identifier for image in new]
        print("PASS directory changes during a build trigger the next rebuild")

        alias = path / "alias"
        alias.symlink_to(path, target_is_directory=True)
        alias_cache = mulled.DirMtimeCacheDirectory(str(alias))
        assert alias_cache._listing is not first._listing
        print("PASS symlink alias remains separate")

        isolated = path / "isolated"
        isolated.mkdir()
        cache = mulled.DirMtimeCacheDirectory(str(isolated))
        key = (str(isolated), "v2")
        reference = weakref.ref(cache._listing)
        del cache
        gc.collect()
        assert reference() is None
        assert key not in mulled._dir_mtime_listings
        print("PASS registry does not retain an unreferenced listing")

        resolver = CachedExplicitSingularityContainerResolver(
            app_info=AppInfo(container_image_cache_path=str(path)),
            cache_directory=str(path), namespace="biocontainers", cache_directory_cacher_type="dir_mtime",
        )
        assert resolver.cache_directory._listing is first._listing
        tool_info = ToolInfo(container_descriptions=[ContainerDescription("quay.io/biocontainers/foo:1.0", type="docker")])
        description = resolver.resolve(enabled_container_types=["singularity"], tool_info=tool_info)
        assert description.identifier == str(path / "foo:1.0--1")
        print("PASS explicit namespace resolver shares state and picks newest matching build")

    names = [f"package{i}:1.{j}--h0_{build}" for i in range(80) for j in (0, 2, 10) for build in (0, 1)]
    names += [f"mulled-v2-{i:040x}:{j:040x}-{build}" for i in range(80) for j in range(3) for build in (0, 1)]
    names += [f"mulled-v1-{i:040x}:{build}" for i in range(80) for build in (0, 1)]
    names += ["package0", "package0:latest", "package1:1.2--h0_1"]
    random.Random(24017).shuffle(names)
    def by_name(values):
        grouped = {}
        for value in values:
            grouped.setdefault(value.rsplit(":", 1)[0], []).append(value)
        return grouped
    assert by_name(mulled.version_sorted(names)) == by_name(mulled._version_sorted_per_image_name(names))
    print(f"PASS global and per-image sorting agree within each image name ({len(names)} mixed identifiers)")


if __name__ == "__main__":
    main()
