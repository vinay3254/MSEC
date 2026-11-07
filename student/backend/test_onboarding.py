import requests
from auth.tokens import issue_token
from database import get_db

BASE_URL = "http://127.0.0.1:5000"

def run_tests():
    print("=== Testing Student & Teacher Onboarding & Section Sync ===")
    conn = get_db()
    s_row = conn.execute("SELECT * FROM users WHERE email = 'student@college.edu'").fetchone()
    f_row = conn.execute("SELECT * FROM users WHERE email = 'faculty@college.edu'").fetchone()
    conn.close()

    assert s_row is not None, "Student user not found in DB"
    assert f_row is not None, "Faculty user not found in DB"

    student_token = issue_token(s_row)
    headers_student = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}

    teacher_token = issue_token(f_row)
    headers_teacher = {"Authorization": f"Bearer {teacher_token}", "Content-Type": "application/json"}

    # 1. Complete Student Onboarding
    print("\n--- 1. Testing Student Onboarding ---")
    onboard_payload_student = {
        "full_name": "Demo Student",
        "usn": "1MS21CS042",
        "department": "Computer Science & Engineering",
        "section": "A",
        "dob": "2003-05-14",
        "semester": 6,
        "academic_year": "3rd Year",
        "phone": "+91 9876543210",
        "blood_group": "O+",
        "emergency_contact": "+91 9876543211"
    }
    res = requests.post(f"{BASE_URL}/api/profile/onboarding", json=onboard_payload_student, headers=headers_student)
    print("Student Onboarding Status:", res.status_code)
    assert res.status_code == 200, f"Failed: {res.text}"
    user_data = res.json().get("user", {})
    assert user_data.get("onboarding_completed") == True, "onboarding_completed was not set to true"
    print("Student Onboarding OK: user.onboarding_completed =", user_data.get("onboarding_completed"))

    # Verify student profile in database
    conn = get_db()
    sp = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (s_row['id'],)).fetchone()
    print("Student Profile in DB: section =", sp['section'], ", dob =", sp['dob'], ", academic_year =", sp['academic_year'])
    assert sp['section'] == 'A'
    assert sp['dob'] == '2003-05-14'
    assert sp['academic_year'] == '3rd Year'
    conn.close()

    # 2. Complete Teacher Onboarding
    print("\n--- 2. Testing Teacher Onboarding ---")
    onboard_payload_teacher = {
        "name": "Dr. Sarah Jenkins",
        "dob": "1982-08-20",
        "department": "Computer Science & Engineering",
        "designation": "Associate Professor & Module Coordinator",
        "contact_phone": "+91 9845012345",
        "cabin_room": "Academic Block III, Room 304",
        "is_class_teacher": True,
        "class_teacher_dept": "Computer Science & Engineering",
        "class_teacher_sem": 6,
        "class_teacher_section": "A",
        "usn_start": "1MS21CS001",
        "usn_end": "1MS21CS090",
        "assigned_classes": [
            {
                "department": "Computer Science & Engineering",
                "semester": 6,
                "section": "A",
                "subject_code": "21CS61",
                "subject_name": "Software Engineering"
            },
            {
                "department": "Computer Science & Engineering",
                "semester": 6,
                "section": "B",
                "subject_code": "21CS62",
                "subject_name": "Full Stack Web Development"
            }
        ]
    }
    res_t = requests.post(f"{BASE_URL}/api/teacher/onboarding", json=onboard_payload_teacher, headers=headers_teacher)
    print("Teacher Onboarding Status:", res_t.status_code)
    assert res_t.status_code == 200, f"Failed: {res_t.text}"
    user_t = res_t.json().get("user", {})
    assert user_t.get("onboarding_completed") == True, "Faculty onboarding_completed was not set to true"
    print("Teacher Onboarding OK: user.onboarding_completed =", user_t.get("onboarding_completed"))

    # Verify teacher profile in DB
    conn = get_db()
    tp = conn.execute("SELECT * FROM teacher_profiles WHERE user_id = ?", (f_row['id'],)).fetchone()
    print("Teacher Profile in DB: designation =", tp['designation'], ", is_class_teacher =", tp['is_class_teacher'], ", class_teacher_section =", tp['class_teacher_section'])
    assert tp['designation'] == "Associate Professor & Module Coordinator"
    assert tp['is_class_teacher'] == True
    assert tp['class_teacher_section'] == "A"
    assert tp['usn_start'] == "1MS21CS001"
    assert tp['usn_end'] == "1MS21CS090"
    conn.close()

    # 3. Verify Teacher Classes
    print("\n--- 3. Testing Teacher Assigned Classes ---")
    classes_res = requests.get(f"{BASE_URL}/api/teacher/classes", headers=headers_teacher)
    print("Teacher Classes Status:", classes_res.status_code)
    assert classes_res.status_code == 200
    classes = classes_res.json().get('classes', [])
    print("Assigned Classes count:", len(classes))
    sections_assigned = [c.get("section") for c in classes]
    print("Sections assigned to teacher:", sections_assigned)
    assert "A" in sections_assigned and "B" in sections_assigned

    # 4. Verify Section A Filtering
    print("\n--- 4. Testing Section A Students Synchronization ---")
    sec_a_res = requests.get(
        f"{BASE_URL}/api/teacher/students?department=Computer%20Science%20%26%20Engineering&semester=6&section=A",
        headers=headers_teacher
    )
    assert sec_a_res.status_code == 200
    sec_a_students = sec_a_res.json().get("students", [])
    usns_a = [s.get("usn") for s in sec_a_students]
    print("Students returned for Section A:", usns_a)
    assert "1MS21CS042" in usns_a, f"Expected 1MS21CS042 in Section A students, got {usns_a}"

    # 5. Verify Section B Filtering (Student 1MS21CS042 must NOT appear in Section B)
    print("\n--- 5. Testing Section B Students Filtering ---")
    sec_b_res = requests.get(
        f"{BASE_URL}/api/teacher/students?department=Computer%20Science%20%26%20Engineering&semester=6&section=B",
        headers=headers_teacher
    )
    assert sec_b_res.status_code == 200
    sec_b_students = sec_b_res.json().get("students", [])
    usns_b = [s.get("usn") for s in sec_b_students]
    print("Students returned for Section B:", usns_b)
    assert "1MS21CS042" not in usns_b, f"Student 1MS21CS042 should NOT be returned in Section B!"

    print("\n>>> ALL ONBOARDING & SECTION SYNCHRONIZATION TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
