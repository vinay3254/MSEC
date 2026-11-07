def test_attendance_summary(client):
    response = client.get("/api/v1/attendance/summary")
    assert response.status_code == 200
    data = response.json()
    assert "attendance_rate" in data
    assert "present_count" in data


def test_mess_menu(client):
    response = client.get("/api/v1/mess/menu")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_visitors_list(client):
    response = client.get("/api/v1/visitors")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_inventory_list(client):
    response = client.get("/api/v1/inventory")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_reports_summary(client):
    response = client.get("/api/v1/reports/summary")
    assert response.status_code == 200
    data = response.json()
    assert "occupancy" in data
    assert "finances" in data
    assert "maintenance" in data
    assert "inventory" in data
