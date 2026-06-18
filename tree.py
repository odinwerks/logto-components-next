#!/usr/bin/env python3
"""
tree.py – Pretty directory tree or flat path list.

Usage:
  python tree.py                        # Pretty ASCII tree
  python tree.py --paths                # Flat file paths, one per line
  python tree.py --ignoretests          # Exclude test/spec/stories files
  python tree.py --paths --ignoretests  # Flat paths, no test files
"""
import argparse
import os
import re

# Directories always skipped during traversal
SKIP_DIRS = {".git", "node_modules", ".next", "__pycache__", ".cache", "dist", "coverage"}

# Patterns that identify test/spec/stories files
TEST_PATTERNS = [
    re.compile(r"\.test\.", re.IGNORECASE),    # *.test.*
    re.compile(r"\.spec\.", re.IGNORECASE),    # *.spec.*
    re.compile(r"\.stories\.", re.IGNORECASE), # *.stories.*
]

# Directory name segments that mark a test subtree
TEST_DIR_SEGMENTS = {"__tests__", "test", "tests"}


def is_test_file(name: str, rel_parts: list[str]) -> bool:
    """Return True if the file looks like a test/spec/stories file."""
    # Check if any ancestor directory is a test directory
    for part in rel_parts[:-1]:  # exclude filename itself
        if part.lower() in TEST_DIR_SEGMENTS:
            return True
    # Check the filename itself
    for pattern in TEST_PATTERNS:
        if pattern.search(name):
            return True
    return False


def collect_paths(root: str, ignore_tests: bool) -> list[str]:
    """Return sorted list of all file paths (relative to root) under root."""
    result = []
    for dirpath, dirnames, filenames in os.walk(root, topdown=True):
        # Prune skip dirs in-place so os.walk doesn't descend into them
        dirnames[:] = sorted(
            d for d in dirnames if d not in SKIP_DIRS
        )

        rel_dir = os.path.relpath(dirpath, root)
        rel_parts = [] if rel_dir == "." else rel_dir.replace("\\", "/").split("/")

        # If ignore_tests and this dir is itself a test directory, skip all its contents
        if ignore_tests and any(p.lower() in TEST_DIR_SEGMENTS for p in rel_parts):
            dirnames[:] = []  # don't recurse further
            continue

        for name in sorted(filenames):
            file_rel_parts = rel_parts + [name]
            if ignore_tests and is_test_file(name, file_rel_parts):
                continue
            if rel_dir == ".":
                result.append(name)
            else:
                result.append(rel_dir.replace("\\", "/") + "/" + name)

    return sorted(result)


def print_tree(root: str, ignore_tests: bool) -> None:
    """Print a pretty ASCII/Unicode box-drawing tree rooted at `root`."""
    root_name = os.path.basename(os.path.abspath(root))
    print(f"{root_name}/")
    _tree_recurse(root, root, "", ignore_tests)


def _tree_recurse(root: str, path: str, prefix: str, ignore_tests: bool) -> None:
    try:
        raw_entries = sorted(os.listdir(path), key=str.lower)
    except PermissionError:
        return

    rel_path = os.path.relpath(path, root)
    rel_parts = [] if rel_path == "." else rel_path.replace("\\", "/").split("/")

    # Build a filtered list of (name, is_dir)
    entries = []
    for name in raw_entries:
        full = os.path.join(path, name)
        if os.path.isdir(full):
            if name in SKIP_DIRS:
                continue
            if ignore_tests and name.lower() in TEST_DIR_SEGMENTS:
                continue
            entries.append((name, True))
        else:
            if ignore_tests and is_test_file(name, rel_parts + [name]):
                continue
            entries.append((name, False))

    for i, (name, is_dir) in enumerate(entries):
        is_last = i == len(entries) - 1
        connector = "└── " if is_last else "├── "
        extension = "    " if is_last else "│   "

        if is_dir:
            print(f"{prefix}{connector}{name}/")
            _tree_recurse(root, os.path.join(path, name), prefix + extension, ignore_tests)
        else:
            print(f"{prefix}{connector}{name}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Print a directory tree or flat file path list."
    )
    parser.add_argument(
        "--paths",
        action="store_true",
        help="Output flat file paths instead of a pretty tree.",
    )
    parser.add_argument(
        "--ignoretests",
        action="store_true",
        help="Exclude test, spec, and stories files from output.",
    )
    args = parser.parse_args()

    root = os.path.abspath(".")

    if args.paths:
        for p in collect_paths(root, args.ignoretests):
            print(p)
    else:
        print_tree(root, args.ignoretests)


if __name__ == "__main__":
    main()
