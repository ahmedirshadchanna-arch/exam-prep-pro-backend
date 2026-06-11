# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pandas",
#     "openpyxl",
# ]
# ///

import sys
import pandas as pd
import sqlite3
import re

def parse_excel(file_path, domain_name, db_path):
    print(f"Parsing {file_path} for Domain: {domain_name}")
    try:
        df = pd.read_excel(file_path)
        # Expected Columns: Strand, Competency, Learning_Objective, Content_Type, Content, AO_Level, Grade
    except Exception as e:
        print(f"Error reading Excel: {e}")
        sys.exit(1)

    # Connect to SQLite Database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Insert or Get Subject
    cursor.execute("INSERT OR IGNORE INTO subjects (name) VALUES (?)", (domain_name,))
    cursor.execute("SELECT id FROM subjects WHERE name = ?", (domain_name,))
    subject_id = cursor.fetchone()[0]

    # Parse rows
    for index, row in df.iterrows():
        try:
            strand = str(row.get('Strand', '')).strip()
            competency = str(row.get('Competency', '')).strip()
            objective = str(row.get('Learning_Objective', '')).strip()
            c_type = str(row.get('Content_Type', '')).strip()
            content = str(row.get('Content', '')).strip()
            ao_raw = str(row.get('AO_Level', 'AO1')).strip()
            grade = str(row.get('Grade', '9-12')).strip()

            if not strand or not competency:
                continue

            # 2. Strand
            cursor.execute("SELECT id FROM strands WHERE subject_id = ? AND name = ?", (subject_id, strand))
            s_row = cursor.fetchone()
            if not s_row:
                cursor.execute("INSERT INTO strands (subject_id, name) VALUES (?, ?)", (subject_id, strand))
                strand_id = cursor.lastrowid
            else:
                strand_id = s_row[0]

            # 3. Competency
            cursor.execute("SELECT id FROM competencies WHERE strand_id = ? AND name = ?", (strand_id, competency))
            c_row = cursor.fetchone()
            if not c_row:
                cursor.execute("INSERT INTO competencies (strand_id, name) VALUES (?, ?)", (strand_id, competency))
                competency_id = cursor.lastrowid
            else:
                competency_id = c_row[0]

            # 4. Objective
            cursor.execute("SELECT id FROM learning_objectives WHERE competency_id = ? AND objective = ?", (competency_id, objective))
            o_row = cursor.fetchone()
            if not o_row:
                cursor.execute("INSERT INTO learning_objectives (competency_id, objective, grade) VALUES (?, ?, ?)", (competency_id, objective, grade))
                objective_id = cursor.lastrowid
            else:
                objective_id = o_row[0]

            # 5. Content Block (with AO1-AO100 validation)
            # Ensure AO tag matches the 100-level taxonomy (AO1 - AO100)
            ao_match = re.search(r'AO([1-9][0-9]?|100)', ao_raw)
            ao_level = ao_match.group(0) if ao_match else "AO1"

            cursor.execute("INSERT INTO content_blocks (objective_id, type, content, ao_level) VALUES (?, ?, ?, ?)", 
                           (objective_id, c_type, content, ao_level))
        
        except Exception as row_e:
            print(f"Error parsing row {index}: {row_e}")
            continue

    conn.commit()
    conn.close()
    print(f"Successfully imported {domain_name} domain data.")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: uv run parser.py <file_path> <domain_name> <db_path>")
        sys.exit(1)
    
    parse_excel(sys.argv[1], sys.argv[2], sys.argv[3])
