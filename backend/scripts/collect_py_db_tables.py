import pathlib
import re
from collections import defaultdict

API_ROOT = pathlib.Path(r"g:/admindesk/backend/api")
pattern = re.compile(r"db_table\s*=\s*['\"]([^'\"]+)['\"]")

results = defaultdict(set)
for path in API_ROOT.rglob("*.py"):
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as exc:  # pragma: no cover
        print(f"skip {path}: {exc}")
        continue
    for m in pattern.finditer(text):
        results[str(path.relative_to(API_ROOT))].add(m.group(1))

all_tables = sorted({t for s in results.values() for t in s})
print(f"Python models db_table count: {len(all_tables)}")
for t in all_tables:
    print(t)
