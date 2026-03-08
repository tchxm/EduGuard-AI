def test_dashboard_requires_login_redirects_to_login(client):
    response = client.get("/dashboard", follow_redirects=False)
    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_login_rejects_invalid_credentials(client):
    response = client.post(
        "/login",
        data={"username": "unknown", "password": "wrong"},
        follow_redirects=True,
    )
    assert response.status_code == 200
    assert b"Login failed" in response.data


def test_login_success_allows_dashboard_access(client, login, seed_data):
    response = login("teacher1", "pass1234")
    assert response.status_code == 302
    assert "/dashboard" in response.headers["Location"]

    dashboard = client.get("/dashboard")
    assert dashboard.status_code == 200
