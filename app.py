import os
import shutil
from datetime import datetime
from pathlib import Path
from flask import Flask
from flask_login import LoginManager
from models import db, Teacher, Student, Class, Attendance, AttendanceRecord
from sqlalchemy import text
import subprocess
import cv2
import sys
import threading
from dotenv import load_dotenv

# Path to face recognition script
FACE_RECOGNITION_SCRIPT = "helpers.py"

# Flag to track if process is running
process_running = False

# Initialize Login Manager
login_manager = LoginManager()
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return Teacher.query.get(int(user_id))

def _configure_database_path(app):
    """
    Use a single canonical database file under instance/.
    """
    os.makedirs(app.instance_path, exist_ok=True)
    canonical_db_path = Path(app.instance_path) / "eduguard.db"
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{canonical_db_path.as_posix()}"
    return canonical_db_path

def _migrate_and_archive_legacy_db(app, canonical_db_path):
    """
    One-time migration helper:
    - If legacy root DB exists and canonical DB is missing, copy legacy -> canonical
    - Always move legacy root DB to instance/db_backups to remove path ambiguity
    """
    legacy_db_path = Path(app.root_path) / "eduGuard.db"
    if not legacy_db_path.exists():
        return

    if not canonical_db_path.exists():
        shutil.copy2(legacy_db_path, canonical_db_path)
        print(f"Migrated legacy DB to canonical path: {canonical_db_path}")

    backup_dir = Path(app.instance_path) / "db_backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"eduGuard_legacy_{stamp}.db"
    shutil.move(str(legacy_db_path), str(backup_path))
    print(f"Archived legacy root DB to: {backup_path}")

def create_app():
    load_dotenv()

    # Initialize Flask application
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'eduguardai-dev-secret-key')
    canonical_db_path = _configure_database_path(app)
    _migrate_and_archive_legacy_db(app, canonical_db_path)
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = 'static/dataset'

    # Ensure the dataset directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize extensions with app
    db.init_app(app)
    login_manager.init_app(app)

    with app.app_context():
        # Import and register routes
        from routes import register_routes
        register_routes(app)
        
        # Create database tables
        db.create_all()
        
        # Migration: ensure student_id is NOT globally unique; enforce unique per (student_id, class_id)
        try:
            conn = db.engine.raw_connection()
            cur = conn.cursor()
            # Determine if composite unique index already exists
            cur.execute("PRAGMA index_list(student);")
            index_rows = cur.fetchall()
            index_names = [r[1] for r in index_rows] if index_rows else []
            has_composite = False
            for name in index_names:
                try:
                    cur.execute(f"PRAGMA index_info('{name}')")
                    cols = [r[2] for r in cur.fetchall()]
                    if set(cols) == {"student_id", "class_id"}:
                        has_composite = True
                        break
                except Exception:
                    pass

            # Detect presence of a global unique on student_id only via indexes
            has_global_unique = False
            for r in index_rows or []:
                # r = (seq, name, unique, origin, partial)
                name = r[1]
                unique = r[2]
                if unique == 1:
                    cur.execute(f"PRAGMA index_info('{name}')")
                    cols = [c[2] for c in cur.fetchall()]
                    if cols == ["student_id"]:
                        has_global_unique = True
                        break

            # Also detect UNIQUE constraint inside CREATE TABLE statement
            cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='student';")
            row = cur.fetchone()
            student_create_sql = (row[0] or '').lower() if row else ''
            has_inline_unique_only_student_id = False
            if 'unique' in student_create_sql:
                # If it doesn't explicitly contain the composite unique, treat as needing migration
                if 'unique (student_id, class_id)' not in student_create_sql:
                    # If it references unique on just student_id (common legacy), mark for migration
                    if 'unique(student_id)' in student_create_sql or 'unique (student_id)' in student_create_sql or 'unique "student_id"' in student_create_sql:
                        has_inline_unique_only_student_id = True

            needs_rebuild = (has_inline_unique_only_student_id or not has_composite)

            # If there's a standalone unique index on student_id, drop it proactively
            if has_global_unique:
                try:
                    # Find and drop any unique index solely on student_id
                    cur.execute("PRAGMA index_list(student);")
                    for r in cur.fetchall() or []:
                        name = r[1]
                        unique = r[2]
                        if unique == 1:
                            cur.execute(f"PRAGMA index_info('{name}')")
                            cols = [c[2] for c in cur.fetchall()]
                            if cols == ["student_id"]:
                                print(f"Dropping legacy unique index: {name}")
                                cur.execute(f"DROP INDEX IF EXISTS '{name}';")
                                conn.commit()
                except Exception as e:
                    print(f"Warning: could not drop legacy unique index on student_id: {str(e)}")

            if needs_rebuild:
                print("Migrating 'student' table to drop global UNIQUE(student_id) and add UNIQUE(student_id, class_id)...")
                cur.execute("PRAGMA foreign_keys=off;")
                conn.commit()
                # Create new table schema without global unique and with composite unique
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS student_new (
                        id INTEGER PRIMARY KEY,
                        student_id VARCHAR(50) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(120) NOT NULL,
                        phone VARCHAR(20) NOT NULL,
                        face_encoding TEXT,
                        image_file VARCHAR(100) DEFAULT 'default.jpg',
                        class_id INTEGER NOT NULL,
                        CONSTRAINT uq_student_per_class UNIQUE (student_id, class_id),
                        FOREIGN KEY(class_id) REFERENCES class(id)
                    );
                    """
                )
                conn.commit()
                # Copy data
                cur.execute(
                    """
                    INSERT OR IGNORE INTO student_new (id, student_id, name, email, phone, face_encoding, image_file, class_id)
                    SELECT id, student_id, name, email, phone, face_encoding, image_file, class_id FROM student;
                    """
                )
                conn.commit()
                # Replace old table
                cur.execute("DROP TABLE student;")
                conn.commit()
                cur.execute("ALTER TABLE student_new RENAME TO student;")
                conn.commit()
                cur.execute("PRAGMA foreign_keys=on;")
                conn.commit()
                print("Migration completed successfully.")

            # Ensure composite unique index exists
            db.session.execute(text(
                'CREATE UNIQUE INDEX IF NOT EXISTS uq_student_per_class ON student (student_id, class_id)'
            ))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Student table migration skipped or failed: {str(e)}")
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    return app

# Create the application instance
app = create_app()

def monitor_process(process, result_file):
    """Monitor the face detection process and handle results when it finishes"""
    global process_running
    
    # Wait for process to complete
    process.wait()
    process_running = False
    
    print(f"Face detection process completed. Results saved to {result_file}")

def start_face_detection(db_path, result_file=None, attendance_id=None):
    """
    Start face detection in a separate window
    
    Parameters:
    - db_path: Path to the database file
    - result_file: Path to save results (optional)
    - attendance_id: ID of the attendance record to update
    
    Returns:
    Dictionary with status and message
    """
    global process_running
    
    if process_running:
        return {"status": "error", "message": "Face detection is already running"}
    
    # Create temporary result file if none provided
    if not result_file:
        result_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance_results.json")
    
    # Get absolute path to script and database
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), FACE_RECOGNITION_SCRIPT)
    abs_db_path = os.path.abspath(db_path)
    
    print(f"Starting face detection with:")
    print(f"Script: {script_path}")
    print(f"Database: {abs_db_path}")
    print(f"Results file: {result_file}")
    print(f"Attendance ID: {attendance_id}")
    
    # Build attendance_id argument if provided
    attendance_arg = f"--attendance-id={attendance_id}" if attendance_id else ""
    
    # Launch face detection in a separate process with VISIBLE window
    try:
        # Build command to run face detection script
        if os.name == 'nt':  # Windows
            # Use START command to force a new window
            cmd = f'start "" {sys.executable} "{script_path}" --external-db="{abs_db_path}" --result-file="{result_file}" {attendance_arg}'
            print(f"Executing command: {cmd}")
            process = subprocess.Popen(cmd, shell=True)
        else:  # Mac/Linux
            cmd = [sys.executable, script_path, f"--external-db={abs_db_path}", f"--result-file={result_file}"]
            if attendance_id:
                cmd.append(f"--attendance-id={attendance_id}")
            print(f"Executing command: {' '.join(cmd)}")
            process = subprocess.Popen(cmd)
        
        process_running = True
        
        # Start thread to monitor process and load results when finished
        threading.Thread(target=monitor_process, args=(process, result_file)).start()
        
        return {"status": "success", "message": "Face detection started successfully"}
    except Exception as e:
        error_msg = f"Error starting face detection: {str(e)}"
        print(error_msg)
        return {"status": "error", "message": error_msg}

if __name__ == '__main__':
    app.run(debug=True) 
