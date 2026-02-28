import csv
import pathlib
import re
from collections import defaultdict

CSV_PATH = r"c:\Users\Hitesh\Downloads\data-1772292050060.csv"
MODELS_ROOT = pathlib.Path(__file__).resolve().parents[1] / "models"

# Load DB tables from CSV
with open(CSV_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    db_tables = set(row["table_name"] for row in reader)

pattern = re.compile(r"tableName:\s*['\"]([^'\"]+)")
model_tables = defaultdict(set)

for path in MODELS_ROOT.rglob("*"):
    if path.suffix.lower() not in {".mjs", ".js"}:
        continue
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as exc:  # pragma: no cover
        print(f"skip {path}: {exc}")
        continue
    for match in pattern.finditer(text):
        model_tables[str(path.relative_to(MODELS_ROOT))].add(match.group(1))

all_model_tables = set(t for vals in model_tables.values() for t in vals)
missing_in_db = sorted(all_model_tables - db_tables)
extra_in_db = sorted(db_tables - all_model_tables)

print(f"Model tables count: {len(all_model_tables)}")
print(f"DB tables count: {len(db_tables)}")

print("\nTables in models but not in DB:")
for t in missing_in_db:
    print(f"- {t}")

print("\nTables in DB but not referenced in models (first 80):")
for t in extra_in_db[:80]:
    print(f"- {t}")
print(f"\nTotal extra (DB-only): {len(extra_in_db)}")
