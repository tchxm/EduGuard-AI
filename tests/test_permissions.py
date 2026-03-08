from models import AttendanceRecord


def test_mark_attendance_forbidden_for_non_owner(client, login, seed_data):
    login("teacher2", "pass1234")

    response = client.post(
        "/api/mark_attendance",
        json={
            "attendance_id": seed_data["attendance1_id"],
            "student_id": seed_data["student1_id"],
            "status": True,
        },
    )

    assert response.status_code == 403
    assert response.get_json()["error"] == "Permission denied"


def test_mark_attendance_allowed_for_owner_updates_record(app, client, login, seed_data):
    login("teacher1", "pass1234")

    response = client.post(
        "/api/mark_attendance",
        json={
            "attendance_id": seed_data["attendance1_id"],
            "student_id": seed_data["student1_id"],
            "status": True,
        },
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True

    with app.app_context():
        record = AttendanceRecord.query.filter_by(
            attendance_id=seed_data["attendance1_id"],
            student_id=seed_data["student1_id"],
        ).first()
        assert record is not None
        assert record.status is True


def test_class_and_student_ownership_boundaries(client, login, seed_data):
    login("teacher2", "pass1234")

    view_class_resp = client.get(f"/class/{seed_data['class1_id']}", follow_redirects=True)
    assert view_class_resp.status_code == 200
    assert b"do not have permission to view this class" in view_class_resp.data

    add_student_resp = client.get(f"/student/new/{seed_data['class1_id']}", follow_redirects=True)
    assert add_student_resp.status_code == 200
    assert b"do not have permission to add students to this class" in add_student_resp.data

    edit_student_resp = client.get(f"/student/edit/{seed_data['student1_id']}", follow_redirects=True)
    assert edit_student_resp.status_code == 200
    assert b"do not have permission to edit this student" in edit_student_resp.data

    delete_student_resp = client.post(f"/student/delete/{seed_data['student1_id']}", follow_redirects=True)
    assert delete_student_resp.status_code == 200
    assert b"do not have permission to delete this student" in delete_student_resp.data
