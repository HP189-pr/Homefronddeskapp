import pathlib
import re

MODELS_ROOT = pathlib.Path(__file__).resolve().parents[1] / "models"
pattern = re.compile(r"tableName:\s*['\"]([^'\"]+)")
all_tables = set()
for path in MODELS_ROOT.rglob("*"):
    if path.suffix.lower() not in {".mjs", ".js"}:
        continue
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        continue
    for m in pattern.finditer(text):
        all_tables.add(m.group(1))

for t in sorted(all_tables):
    print(t)
