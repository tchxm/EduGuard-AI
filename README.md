# EduGuard AI

EduGuard AI is a Flask-based attendance system for teachers. It supports class and student management, camera-based face detection attendance, manual attendance edits, absence notifications, and report export (PDF/Excel).

## Features

- Teacher authentication (register/login/logout)
- Class and student management
- Face-data registration from uploaded student images
- Attendance session creation by class/date
- External camera detection workflow for marking attendance
- Fast inline manual attendance toggles with retry/sync status
- Absence notification sending
- Attendance and student export (PDF, Excel)
- Role and ownership checks on protected resources

## Tech Stack

- Backend: Flask, Flask-Login, Flask-SQLAlchemy
- Database: SQLite
- Face stack: OpenCV + face-recognition
- Frontend: Bootstrap 5 + vanilla JavaScript

## Project Structure

```text
.
|-- app.py
|-- run.py
|-- routes.py
|-- models.py
|-- helpers.py
|-- requirements.txt
|-- .env.example
|-- static/
|   |-- css/
|   |-- img/
|   `-- dataset/        # kept empty in repo (.gitkeep)
|-- templates/
`-- tests/
```

## Setup

1. Clone the repo
2. Create and activate a virtual environment
3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Create env file

```bash
cp .env.example .env
```

5. Run the app

```bash
python run.py
```

App URL: `http://127.0.0.1:5000`

## Environment Variables

Set these in `.env`:

- `SECRET_KEY`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`

If email vars are missing, notification send attempts are skipped safely.

## Database

- Single source of truth: `instance/eduguard.db`
- Legacy root DB (`eduGuard.db`) is deprecated.
- On startup, legacy DB is migrated/archived automatically when present.

## Tests

Test coverage includes:

- Login/auth boundaries
- Attendance toggle permission checks
- Notification send logic
- Class/student ownership checks

Run:

```bash
pytest -q
```

## GitHub Push Hygiene

This repo is configured to ignore runtime/local files (`.env`, `instance/`, `*.db`, `__pycache__`, uploaded dataset files).

If any of those were already tracked before `.gitignore`, untrack once:

```bash
git rm -r --cached instance __pycache__ static/dataset .env
git add .
git commit -m "Clean tracked runtime artifacts"
```

## License

MIT