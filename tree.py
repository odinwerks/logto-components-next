import os

SKIP = {".git", "node_modules", ".next", "__pycache__", ".cache"}
CYAN = "\033[96m"
GREEN = "\033[92m"
GRAY = "\033[90m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"

top = os.path.abspath(".")
print(f"{BOLD}{os.path.basename(top)}/{RESET}")

def show(path, prefix=""):
    entries = sorted(os.listdir(path), key=str.lower)
    for i, name in enumerate(entries):
        full = os.path.join(path, name)
        is_last = i == len(entries) - 1
        stem = "\u2514\u2500\u2500 " if is_last else "\u251c\u2500\u2500 "
        if os.path.isdir(full) and name not in SKIP:
            print(f"{prefix}{stem}{CYAN}{name}/{RESET}")
            ext = "    " if is_last else "\u2502  "
            show(full, prefix + ext)
        elif not os.path.isdir(full):
            rel = os.path.relpath(full, top)
            print(f"{prefix}{stem}{GREEN}{name}{RESET}  {GRAY}{DIM}({os.path.basename(top)}/{rel}){RESET}")

show(top)
