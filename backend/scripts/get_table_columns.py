import csv
from collections import defaultdict
import sys

csv_path = r"c:\Users\Hitesh\Downloads\data-1772292050060.csv"
targets = {
    'institute', 'api_module', 'api_menu', 'api_userpermissions', 'api_empprofile',
    'admission_cancel', 'convocation_master', 'institute_course_offering', 'main_branch', 'sub_branch',
    'student_degree', 'student_profile', 'transcript_request', 'user_activity_log', 'google_form_submission', 'error_log'
}

cols = defaultdict(list)
with open(csv_path, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        t = row['table_name']
        if t in targets:
            cols[t].append({
                'column_name': row['column_name'],
                'data_type': row['data_type'],
                'char_len': row['character_maximum_length'],
                'num_precision': row['numeric_precision'],
                'num_scale': row['numeric_scale'],
                'is_nullable': row['is_nullable'],
                'default': row['column_default'],
            })

for t in sorted(cols):
    print(f"\n{t}")
    for c in cols[t]:
        print(' - {column_name} | {data_type} | len={char_len} | prec={num_precision} | scale={num_scale} | nullable={is_nullable} | default={default}'.format(**c))

if not cols:
    sys.exit("No tables found")
