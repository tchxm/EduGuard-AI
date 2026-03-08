import os
import sys
import types
from datetime import date

import pytest
from flask import Flask
from flask_login import LoginManager
from werkzeug.security import generate_password_hash

from models import db, Teacher, Class, Student, Attendance, AttendanceRecord


# Provide a lightweight stub so tests do not require native face-recognition libs.
if "face_recognition" not in sys.modules:
    sys.modules["face_recognition"] = types.SimpleNamespace(
        load_image_file=lambda *args, **kwargs: None,
        face_encodings=lambda *args, **kwargs: [],
        face_locations=lambda *args, **kwargs: [],
        compare_faces=lambda known, encoding, tolerance=0.6: [False for _ in known],
        face_distance=lambda known, encoding: [1.0 for _ in known],
    )


@pytest.fixture()
def app(tmp_path):
    from routes import register_routes

    app = Flask(__name__, instance_path=str(tmp_path / "instance"), instance_relative_config=True)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret"
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{(tmp_path / 'test.db').as_posix()}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = str(tmp_path / "uploads")
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.login_view = "login"

    @login_manager.user_loader
    def load_user(user_id):
        return Teacher.query.get(int(user_id))

    login_manager.init_app(app)
    register_routes(app)

    with app.app_context():
        db.create_all()

    yield app

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def seed_data(app):
    with app.app_context():
        t1 = Teacher(
            username="teacher1",
            email="teacher1@example.com",
            password=generate_password_hash("pass1234"),
            name="Teacher One",
        )
        t2 = Teacher(
            username="teacher2",
            email="teacher2@example.com",
            password=generate_password_hash("pass1234"),
            name="Teacher Two",
        )
        db.session.add_all([t1, t2])
        db.session.commit()

        class1 = Class(name="Class One", section="A", teacher_id=t1.id)
        class2 = Class(name="Class Two", section="B", teacher_id=t2.id)
        db.session.add_all([class1, class2])
        db.session.commit()

        s1 = Student(
            student_id="S001",
            name="Student One",
            email="s1@example.com",
            phone="+10000000001",
            class_id=class1.id,
        )
        s2 = Student(
            student_id="S002",
            name="Student Two",
            email="s2@example.com",
            phone="+10000000002",
            class_id=class1.id,
        )
        s3 = Student(
            student_id="S003",
            name="Student Three",
            email="s3@example.com",
            phone="+10000000003",
            class_id=class1.id,
        )
        s_other = Student(
            student_id="S900",
            name="Other Class Student",
            email="other@example.com",
            phone="+19999999999",
            class_id=class2.id,
        )
        db.session.add_all([s1, s2, s3, s_other])
        db.session.commit()

        attendance1 = Attendance(date=date.today(), class_id=class1.id, teacher_id=t1.id)
        db.session.add(attendance1)
        db.session.commit()

        # Three records to exercise notification filtering logic:
        # r1: absent + unsent => should be emailed
        # r2: absent + already sent => should be skipped
        # r3: present => should be skipped
        r1 = AttendanceRecord(attendance_id=attendance1.id, student_id=s1.id, status=False, notification_sent=False)
        r2 = AttendanceRecord(attendance_id=attendance1.id, student_id=s2.id, status=False, notification_sent=True)
        r3 = AttendanceRecord(attendance_id=attendance1.id, student_id=s3.id, status=True, notification_sent=False)
        db.session.add_all([r1, r2, r3])
        db.session.commit()

        return {
            "teacher1_id": t1.id,
            "teacher2_id": t2.id,
            "class1_id": class1.id,
            "class2_id": class2.id,
            "student1_id": s1.id,
            "student2_id": s2.id,
            "student3_id": s3.id,
            "other_student_id": s_other.id,
            "attendance1_id": attendance1.id,
        }


@pytest.fixture()
def login(client):
    def _login(username, password):
        return client.post(
            "/login",
            data={"username": username, "password": password},
            follow_redirects=False,
        )

    return _login
