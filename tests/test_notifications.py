from datetime import date

from models import db, Attendance, AttendanceRecord


def test_send_notifications_only_for_absent_unsent(app, client, login, monkeypatch, seed_data):
    login("teacher1", "pass1234")

    sent_to = []

    def fake_send_email(to_email, subject, message):
        sent_to.append(to_email)
        return True

    monkeypatch.setattr("routes.send_email", fake_send_email)

    response = client.post(
        f"/attendance/send_notifications/{seed_data['attendance1_id']}",
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert len(sent_to) == 1
    assert sent_to[0] == "s1@example.com"

    with app.app_context():
        records = AttendanceRecord.query.filter_by(attendance_id=seed_data["attendance1_id"]).all()
        by_student = {record.student_id: record for record in records}
        assert by_student[seed_data["student1_id"]].notification_sent is True
        assert by_student[seed_data["student2_id"]].notification_sent is True
        assert by_student[seed_data["student3_id"]].notification_sent is False


def test_send_notifications_keeps_pending_when_email_fails(app, client, login, monkeypatch, seed_data):
    login("teacher1", "pass1234")

    with app.app_context():
        attendance = Attendance(
            date=date.today(),
            class_id=seed_data["class1_id"],
            teacher_id=seed_data["teacher1_id"],
        )
        db.session.add(attendance)
        db.session.commit()

        record = AttendanceRecord(
            attendance_id=attendance.id,
            student_id=seed_data["student1_id"],
            status=False,
            notification_sent=False,
        )
        db.session.add(record)
        db.session.commit()
        attendance_id = attendance.id

    monkeypatch.setattr("routes.send_email", lambda to_email, subject, message: False)

    response = client.post(f"/attendance/send_notifications/{attendance_id}", follow_redirects=True)

    assert response.status_code == 200
    assert b"Failed to send 1 notifications" in response.data

    with app.app_context():
        refreshed = AttendanceRecord.query.filter_by(
            attendance_id=attendance_id,
            student_id=seed_data["student1_id"],
        ).first()
        assert refreshed is not None
        assert refreshed.notification_sent is False
