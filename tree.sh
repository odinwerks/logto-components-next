#!/usr/bin/env bash
#
# tree.sh – Pretty directory tree or flat path list.  (Bash port of tree.py)
#
# Usage:
#   ./tree.sh                        # Pretty ASCII tree
#   ./tree.sh --paths                # Flat file paths, one per line
#   ./tree.sh --ignoretests          # Exclude test/spec/stories files
#   ./tree.sh --paths --ignoretests  # Flat paths, no test files
#
# Requires bash >= 4.0 (uses ${var,,} lowercasing).  Filenames containing
# newline or tab characters are not supported.
set -uo pipefail
shopt -s nullglob dotglob

ignore_tests=0
flat_paths=0

usage() {
    cat <<'EOF'
Usage: tree.sh [OPTIONS]

Print a directory tree or flat file path list.

Options:
  --paths         Output flat file paths instead of a pretty tree.
  --ignoretests   Exclude test, spec, and stories files from output.
  -h, --help      Show this help.
EOF
}

# Directories always skipped (case-sensitive exact match on basename)
is_skip_dir() {
    case "$1" in
        .git|node_modules|.next|__pycache__|.cache|dist|coverage) return 0 ;;
    esac
    return 1
}

# Test subtree directory names (case-insensitive)
is_test_dir_name() {
    case "${1,,}" in
        __tests__|test|tests) return 0 ;;
    esac
    return 1
}

# Test/spec/stories file pattern (case-insensitive; requires dots on both sides)
is_test_file_name() {
    case "${1,,}" in
        *.test.*|*.spec.*|*.stories.*) return 0 ;;
    esac
    return 1
}

collect_paths() {
    # Mirror of tree.py collect_paths: prune SKIP_DIRS (dirs only) always;
    # prune test subtrees when --ignoretests; emit relative file paths sorted
    # by codepoint (Python's default sorted() on the path strings).
    local -a prune
    prune=( "(" -type d "(" -name .git -o -name node_modules -o -name .next
              -o -name __pycache__ -o -name .cache -o -name dist
              -o -name coverage ")" -prune ")" )
    if [ "$ignore_tests" = 1 ]; then
        prune+=( -o "(" -type d "(" -iname __tests__ -o -iname test -o -iname tests ")"
                  -prune ")" )
    fi
    prune+=( -o -type f -print )

    find . "${prune[@]}" \
        | sed 's|^\./||' \
        | awk -F/ -v it="$ignore_tests" '
              it == "1" && tolower($NF) ~ /\.(test|spec|stories)\./ { next }
              { print }
          ' \
        | LC_ALL=C sort
}

walk() {
    local dir="$1" prefix="$2"
    local -a all_names=()
    local f
    for f in "$dir"/*; do
        all_names+=("${f##*/}")
    done
    [ "${#all_names[@]}" -eq 0 ] && return 0

    # Sort entries by lowercased name (stable, C locale) to match Python's
    # sorted(os.listdir(path), key=str.lower).  We lowercase explicitly
    # rather than using `sort -f`, which folds to uppercase and mis-orders
    # underscore vs letters.
    local sorted_names
    sorted_names=$(
        LC_ALL=C
        for n in "${all_names[@]}"; do
            printf '%s\t%s\n' "${n,,}" "$n"
        done | LC_ALL=C sort -t$'\t' -k1,1 -s | cut -f2-
    )

    local -a names=() isdirs=()
    local name full
    while IFS= read -r name; do
        [ -z "$name" ] && continue
        full="$dir/$name"
        if [ -d "$full" ]; then
            if is_skip_dir "$name"; then continue; fi
            if [ "$ignore_tests" = 1 ] && is_test_dir_name "$name"; then continue; fi
            names+=("$name"); isdirs+=("1")
        else
            if [ "$ignore_tests" = 1 ] && is_test_file_name "$name"; then continue; fi
            names+=("$name"); isdirs+=("0")
        fi
    done <<< "$sorted_names"

    local count=${#names[@]}
    [ "$count" -eq 0 ] && return 0

    local i connector extension
    for (( i = 0; i < count; i++ )); do
        if [ "$i" -eq $((count - 1)) ]; then
            connector="└── "; extension="    "
        else
            connector="├── "; extension="│   "
        fi
        if [ "${isdirs[i]}" = "1" ]; then
            printf '%s%s%s/\n' "$prefix" "$connector" "${names[i]}"
            walk "$dir/${names[i]}" "$prefix$extension"
        else
            printf '%s%s%s\n' "$prefix" "$connector" "${names[i]}"
        fi
    done
}

print_tree() {
    printf '%s/\n' "${PWD##*/}"
    walk . ""
}

while [ $# -gt 0 ]; do
    case "$1" in
        --paths) flat_paths=1 ;;
        --ignoretests) ignore_tests=1 ;;
        -h|--help) usage; exit 0 ;;
        *) usage >&2; exit 2 ;;
    esac
    shift
done

if [ "$flat_paths" = 1 ]; then
    collect_paths
else
    print_tree
fi