def test_login_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@msec.edu.in", "password": "WrongPassword123"},
    )
    assert response.status_code == 401


def test_dashboard_stats(client):
    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data
    assert "occupancy_rate" in data
    assert "total_rooms" in data
