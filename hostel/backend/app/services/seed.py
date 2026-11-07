from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.hostel import HostelBlock, Room, BlockGender, RoomType, RoomStatus
from app.models.allocation import Allocation, AllocationStatus
from app.models.complaint import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.models.gate_pass import GatePass, PassStatus
from app.models.fee import FeeRecord, FeeType, PaymentStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.visitor import VisitorRecord, VisitorStatus
from app.models.mess import MessMenu, MessFeedback, MealType
from app.models.inventory import InventoryItem, ItemCategory, ItemCondition
from app.models.notice import Notice, NoticePriority


def seed_database(db: Session) -> None:
    """Populate database with initial MSEC Hostel data if empty."""
    # Check if admin already exists
    admin = db.query(User).filter(User.email.in_(["warden@msec.ac.in", "admin@msec.edu.in"])).first()
    if admin:
        return

    print("[SEED] Seeding comprehensive MSEC Hostel Management data...")

    # 1. Users & Students
    admin_user = User(
        email="warden@msec.ac.in",
        hashed_password=get_password_hash("Admin@123"),
        full_name="Dr. Suresh Kumar N.",
        role=UserRole.ADMIN,
        phone="+91 94432 18901",
        department="Hostel Administration",
        is_active=True,
    )
    warden_user = User(
        email="warden.kaveri@msec.edu.in",
        hashed_password=get_password_hash("Warden@123"),
        full_name="Dr. K. Ramanathan",
        role=UserRole.WARDEN,
        phone="+91 98765 12345",
        department="Mechanical Engg",
        is_active=True,
    )
    student1 = User(
        email="rahul.cse@msec.edu.in",
        hashed_password=get_password_hash("Student@123"),
        full_name="Rahul Sharma",
        role=UserRole.STUDENT,
        phone="+91 91234 56789",
        register_number="1ME21CS045",
        department="Computer Science & Engg",
        year_of_study=3,
        parent_name="Ramesh Sharma",
        parent_phone="+91 94441 23456",
        emergency_contact="+91 94441 99887",
        blood_group="O+",
        address="14, Gandhi Nagar 2nd Street, Madurai - 625020",
        is_active=True,
    )
    student2 = User(
        email="priya.ece@msec.edu.in",
        hashed_password=get_password_hash("Student@123"),
        full_name="Priya Dharshini",
        role=UserRole.STUDENT,
        phone="+91 92345 67890",
        register_number="1ME23IS027",
        department="Information Science & Engg",
        year_of_study=2,
        parent_name="V. Senthil Kumar",
        parent_phone="+91 98401 56789",
        emergency_contact="+91 98401 56780",
        blood_group="B+",
        address="7/3, Anna Avenue, Trichy - 620001",
        is_active=True,
    )
    student3 = User(
        email="karthik.it@msec.edu.in",
        hashed_password=get_password_hash("Student@123"),
        full_name="Karthik V",
        role=UserRole.STUDENT,
        phone="+91 93456 78901",
        register_number="1ME22EC018",
        department="Electronics & Comm Engg",
        year_of_study=3,
        parent_name="G. Venkatesan",
        parent_phone="+91 99402 33445",
        emergency_contact="+91 99402 33440",
        blood_group="A+",
        address="52, Cross Cut Road, Coimbatore - 641012",
        is_active=True,
    )
    student4 = User(
        email="ananya.aids@msec.edu.in",
        hashed_password=get_password_hash("Student@123"),
        full_name="Ananya Sundaram",
        role=UserRole.STUDENT,
        phone="+91 94567 89012",
        register_number="1ME24AI005",
        department="Artificial Intelligence & Data Science",
        year_of_study=1,
        parent_name="Dr. M. Sundaram",
        parent_phone="+91 94432 11223",
        emergency_contact="+91 94432 11220",
        blood_group="AB+",
        address="23/A, K.K. Nagar, Salem - 636007",
        is_active=True,
    )
    db.add_all([admin_user, warden_user, student1, student2, student3, student4])
    db.commit()

    # 2. Hostel Blocks
    block_a = HostelBlock(
        name="Kaveri Boys Hostel",
        code="KBH-1",
        gender=BlockGender.BOYS,
        total_floors=4,
        warden_name="Dr. K. Ramanathan",
    )
    block_b = HostelBlock(
        name="Bhavani Girls Hostel",
        code="BGH-1",
        gender=BlockGender.GIRLS,
        total_floors=4,
        warden_name="Dr. S. Meenakshi",
    )
    block_c = HostelBlock(
        name="Vaigai PG & Scholar Hostel",
        code="VPH-1",
        gender=BlockGender.BOYS,
        total_floors=3,
        warden_name="Prof. R. Anbarasan",
    )
    db.add_all([block_a, block_b, block_c])
    db.commit()

    # 3. Rooms
    rooms = [
        # Kaveri Block
        Room(block_id=block_a.id, room_number="101", floor=1, capacity=4, occupied_count=1, room_type=RoomType.NON_AC, status=RoomStatus.AVAILABLE),
        Room(block_id=block_a.id, room_number="102", floor=1, capacity=4, occupied_count=0, room_type=RoomType.NON_AC, status=RoomStatus.AVAILABLE),
        Room(block_id=block_a.id, room_number="201", floor=2, capacity=2, occupied_count=1, room_type=RoomType.AC, status=RoomStatus.AVAILABLE),
        Room(block_id=block_a.id, room_number="202", floor=2, capacity=2, occupied_count=2, room_type=RoomType.AC, status=RoomStatus.OCCUPIED),
        # Bhavani Block
        Room(block_id=block_b.id, room_number="101", floor=1, capacity=4, occupied_count=2, room_type=RoomType.NON_AC, status=RoomStatus.AVAILABLE),
        Room(block_id=block_b.id, room_number="102", floor=1, capacity=4, occupied_count=0, room_type=RoomType.NON_AC, status=RoomStatus.AVAILABLE),
        Room(block_id=block_b.id, room_number="201", floor=2, capacity=2, occupied_count=0, room_type=RoomType.AC, status=RoomStatus.AVAILABLE),
        # Vaigai Block
        Room(block_id=block_c.id, room_number="101", floor=1, capacity=1, occupied_count=0, room_type=RoomType.AC, status=RoomStatus.MAINTENANCE),
    ]
    db.add_all(rooms)
    db.commit()

    # 4. Allocations
    alloc1 = Allocation(
        student_id=student1.id,
        room_id=rooms[0].id,
        bed_number="Bed-A",
        academic_year="2025-2026",
        status=AllocationStatus.ACTIVE,
    )
    alloc2 = Allocation(
        student_id=student2.id,
        room_id=rooms[4].id,
        bed_number="Bed-A",
        academic_year="2025-2026",
        status=AllocationStatus.ACTIVE,
    )
    alloc3 = Allocation(
        student_id=student3.id,
        room_id=rooms[2].id,
        bed_number="Bed-A",
        academic_year="2025-2026",
        status=AllocationStatus.ACTIVE,
    )
    alloc4 = Allocation(
        student_id=student4.id,
        room_id=rooms[4].id,
        bed_number="Bed-B",
        academic_year="2025-2026",
        status=AllocationStatus.ACTIVE,
    )
    db.add_all([alloc1, alloc2, alloc3, alloc4])
    db.commit()

    # 5. Complaints
    now = datetime.now(timezone.utc)
    complaints = [
        Complaint(
            student_id=student1.id,
            room_id=rooms[0].id,
            title="Ceiling fan speed regulator faulty",
            description="The regulator switch is stuck on low speed and vibrating.",
            category=ComplaintCategory.ELECTRICAL,
            priority=ComplaintPriority.MEDIUM,
            status=ComplaintStatus.PENDING,
            created_at=now - timedelta(days=1),
        ),
        Complaint(
            student_id=student2.id,
            room_id=rooms[4].id,
            title="Bathroom tap leaking continuously",
            description="Persistent water leakage in attached washroom faucet.",
            category=ComplaintCategory.PLUMBING,
            priority=ComplaintPriority.HIGH,
            status=ComplaintStatus.IN_PROGRESS,
            resolution_notes="Plumber assigned, repair scheduled for tomorrow 10 AM.",
            created_at=now - timedelta(days=2),
        ),
        Complaint(
            student_id=student3.id,
            room_id=rooms[2].id,
            title="Wi-Fi 5GHz band connectivity drop",
            description="Unable to connect to MSEC-Hostel-2F access point in evening hours.",
            category=ComplaintCategory.WIFI,
            priority=ComplaintPriority.LOW,
            status=ComplaintStatus.RESOLVED,
            resolution_notes="Router firmware restarted and signal channel tuned.",
            created_at=now - timedelta(days=5),
            resolved_at=now - timedelta(days=3),
        ),
    ]
    db.add_all(complaints)
    db.commit()

    # 6. Gate Passes / Outpass
    gate_passes = [
        GatePass(
            student_id=student1.id,
            destination="Chennai Central Railway Station",
            reason="Traveling home for the weekend festival holidays",
            departure_time=now + timedelta(days=1, hours=4),
            expected_return_time=now + timedelta(days=3, hours=12),
            status=PassStatus.APPROVED,
            approved_by="Dr. K. Ramanathan (Warden)",
            parent_consent="Parent confirmed via SMS",
        ),
        GatePass(
            student_id=student2.id,
            destination="Tambaram City Library",
            reason="Project research and technical textbook references",
            departure_time=now + timedelta(hours=2),
            expected_return_time=now + timedelta(hours=6),
            status=PassStatus.PENDING,
            parent_consent="Verified",
        ),
    ]
    db.add_all(gate_passes)
    db.commit()

    # 7. Fee Records
    fees = [
        FeeRecord(
            student_id=student1.id,
            academic_year="2025-2026",
            fee_type=FeeType.HOSTEL_FEE,
            total_amount=45000.0,
            paid_amount=45000.0,
            due_date=now - timedelta(days=30),
            status=PaymentStatus.PAID,
            transaction_ref="TXN_MSEC_981240",
        ),
        FeeRecord(
            student_id=student1.id,
            academic_year="2025-2026",
            fee_type=FeeType.MESS_FEE,
            total_amount=25000.0,
            paid_amount=25000.0,
            due_date=now - timedelta(days=30),
            status=PaymentStatus.PAID,
            transaction_ref="TXN_MSEC_981241",
        ),
        FeeRecord(
            student_id=student2.id,
            academic_year="2025-2026",
            fee_type=FeeType.HOSTEL_FEE,
            total_amount=45000.0,
            paid_amount=25000.0,
            due_date=now + timedelta(days=15),
            status=PaymentStatus.PENDING,
            transaction_ref="TXN_MSEC_981350",
        ),
        FeeRecord(
            student_id=student3.id,
            academic_year="2025-2026",
            fee_type=FeeType.MESS_FEE,
            total_amount=25000.0,
            paid_amount=0.0,
            due_date=now - timedelta(days=5),
            status=PaymentStatus.OVERDUE,
        ),
    ]
    db.add_all(fees)
    db.commit()

    # 8. Daily Attendance
    today_str = now.strftime("%Y-%m-%d")
    yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    attendance_records = [
        AttendanceRecord(student_id=student1.id, date=today_str, status=AttendanceStatus.PRESENT),
        AttendanceRecord(student_id=student2.id, date=today_str, status=AttendanceStatus.PRESENT),
        AttendanceRecord(student_id=student3.id, date=today_str, status=AttendanceStatus.PRESENT),
        AttendanceRecord(student_id=student4.id, date=today_str, status=AttendanceStatus.LATE, remarks="Arrived 08:45 PM from lab"),
        # Yesterday
        AttendanceRecord(student_id=student1.id, date=yesterday_str, status=AttendanceStatus.PRESENT),
        AttendanceRecord(student_id=student2.id, date=yesterday_str, status=AttendanceStatus.PRESENT),
        AttendanceRecord(student_id=student3.id, date=yesterday_str, status=AttendanceStatus.ON_LEAVE, remarks="Medical leave approved"),
        AttendanceRecord(student_id=student4.id, date=yesterday_str, status=AttendanceStatus.PRESENT),
    ]
    db.add_all(attendance_records)
    db.commit()

    # 9. Visitor Management
    visitors = [
        VisitorRecord(
            visitor_name="Ramesh Sharma",
            phone="+91 94441 23456",
            relationship="Father",
            student_id=student1.id,
            purpose="Delivering winter clothes and laptop charger",
            id_proof_type="Aadhar Card",
            id_proof_number="XXXX-XXXX-4512",
            entry_time=now - timedelta(hours=1),
            status=VisitorStatus.CHECKED_IN,
            remarks="Allowed in Hostel Visitor Lounge",
        ),
        VisitorRecord(
            visitor_name="K. Meenakshi",
            phone="+91 98402 99881",
            relationship="Mother",
            student_id=student2.id,
            purpose="Weekend family visit and health checkup meeting",
            id_proof_type="Voter ID",
            id_proof_number="TN/02/124/9912",
            entry_time=now - timedelta(days=1, hours=3),
            exit_time=now - timedelta(days=1, hours=1),
            status=VisitorStatus.CHECKED_OUT,
            remarks="Completed visit",
        ),
    ]
    db.add_all(visitors)
    db.commit()

    # 10. Mess Menu (Weekly Schedule)
    mess_items = [
        # Monday
        MessMenu(day_of_week="Monday", meal_type=MealType.BREAKFAST, items="Idli, Medu Vada, Sambar, Coconut Chutney, Tea/Coffee", timings="07:30 AM - 09:00 AM"),
        MessMenu(day_of_week="Monday", meal_type=MealType.LUNCH, items="South Indian Meals: White Rice, Mor Kuzhambu, Beetroot Poriyal, Rasam, Curd, Appalam", timings="12:30 PM - 02:00 PM"),
        MessMenu(day_of_week="Monday", meal_type=MealType.SNACKS, items="Sundal, Veg Cutlet, Masala Tea", timings="04:45 PM - 05:45 PM"),
        MessMenu(day_of_week="Monday", meal_type=MealType.DINNER, items="Chappati, Paneer Butter Masala, Jeera Rice, Dal Fry, Milk", timings="07:30 PM - 09:00 PM"),
        # Tuesday
        MessMenu(day_of_week="Tuesday", meal_type=MealType.BREAKFAST, items="Puri Masala, Rava Kesari, Filter Coffee", timings="07:30 AM - 09:00 AM"),
        MessMenu(day_of_week="Tuesday", meal_type=MealType.LUNCH, items="Variety Rice: Tomato Rice, Curd Rice, Potato Fry, Pickle, Papad", timings="12:30 PM - 02:00 PM"),
        MessMenu(day_of_week="Tuesday", meal_type=MealType.SNACKS, items="Onion Samosa, Green Chutney, Coffee", timings="04:45 PM - 05:45 PM"),
        MessMenu(day_of_week="Tuesday", meal_type=MealType.DINNER, items="Kal Dosa, Tomato Kurma, Coconut Chutney, Idli Podi, Fresh Milk", timings="07:30 PM - 09:00 PM"),
        # Wednesday (Special Day)
        MessMenu(day_of_week="Wednesday", meal_type=MealType.BREAKFAST, items="Pongal, Medu Vada, Sambar, Ginger Chutney", timings="07:30 AM - 09:00 AM"),
        MessMenu(day_of_week="Wednesday", meal_type=MealType.LUNCH, items="MSEC Feast: Vegetable Biryani / Egg Biryani, Ennai Kathirikai, Raita, Gulab Jamun", timings="12:30 PM - 02:00 PM", is_special=True),
        MessMenu(day_of_week="Wednesday", meal_type=MealType.SNACKS, items="Bajji, Sweet Corn, Tea", timings="04:45 PM - 05:45 PM"),
        MessMenu(day_of_week="Wednesday", meal_type=MealType.DINNER, items="Parotta, Veg Salna, Egg Gravy, Onion Raitha", timings="07:30 PM - 09:00 PM", is_special=True),
        # Thursday
        MessMenu(day_of_week="Thursday", meal_type=MealType.BREAKFAST, items="Rava Upma, Coconut Chutney, Banana, Tea/Coffee", timings="07:30 AM - 09:00 AM"),
        MessMenu(day_of_week="Thursday", meal_type=MealType.LUNCH, items="Rice, Drumstick Sambar, Cabbage Kootu, Tomato Rasam, Curd", timings="12:30 PM - 02:00 PM"),
        MessMenu(day_of_week="Thursday", meal_type=MealType.SNACKS, items="Karamani Sundal, Biscuits, Hot Tea", timings="04:45 PM - 05:45 PM"),
        MessMenu(day_of_week="Thursday", meal_type=MealType.DINNER, items="Phulka, Aloo Gobi Masala, Plain Rice, Rasam, Buttermilk", timings="07:30 PM - 09:00 PM"),
        # Friday
        MessMenu(day_of_week="Friday", meal_type=MealType.BREAKFAST, items="Ghee Masala Dosa, Sambar, Mint Chutney, Filter Coffee", timings="07:30 AM - 09:00 AM", is_special=True),
        MessMenu(day_of_week="Friday", meal_type=MealType.LUNCH, items="Rice, Vatha Kuzhambu, Avial, Pepper Rasam, Mor, Payasam", timings="12:30 PM - 02:00 PM"),
        MessMenu(day_of_week="Friday", meal_type=MealType.SNACKS, items="Pani Puri / Bhel Puri, Tea", timings="04:45 PM - 05:45 PM"),
        MessMenu(day_of_week="Friday", meal_type=MealType.DINNER, items="Fried Rice, Veg Manchurian Gravy, Mixed Salad", timings="07:30 PM - 09:00 PM"),
        # Saturday
        MessMenu(day_of_week="Saturday", meal_type=MealType.BREAKFAST, items="Semiya Upma, Coconut Chutney, Boiled Egg, Coffee", timings="07:30 AM - 09:00 AM"),
        MessMenu(day_of_week="Saturday", meal_type=MealType.LUNCH, items="Lemon Rice, Curd Rice, Potato Podimas, Pickle, Papad", timings="12:30 PM - 02:00 PM"),
        MessMenu(day_of_week="Saturday", meal_type=MealType.SNACKS, items="Pakkoda, Filter Coffee", timings="04:45 PM - 05:45 PM"),
        MessMenu(day_of_week="Saturday", meal_type=MealType.DINNER, items="Chappati, Green Peas Masala, Curd Rice, Pickle", timings="07:30 PM - 09:00 PM"),
        # Sunday
        MessMenu(day_of_week="Sunday", meal_type=MealType.BREAKFAST, items="Chole Bhature, Sweet Lassi / Coffee", timings="08:00 AM - 09:30 AM", is_special=True),
        MessMenu(day_of_week="Sunday", meal_type=MealType.LUNCH, items="Sunday Feast: Chicken Gravy / Paneer Butter Masala, White Rice, Dal, Rasam, Curd, Ice Cream", timings="12:30 PM - 02:30 PM", is_special=True),
        MessMenu(day_of_week="Sunday", meal_type=MealType.SNACKS, items="Cookies, Milk / Tea", timings="05:00 PM - 06:00 PM"),
        MessMenu(day_of_week="Sunday", meal_type=MealType.DINNER, items="Idiyappam, Coconut Milk, Veg Kurma, Banana", timings="07:30 PM - 09:00 PM"),
    ]
    db.add_all(mess_items)
    db.commit()

    # 11. Mess Feedback
    feedbacks = [
        MessFeedback(
            student_id=student1.id,
            meal_type=MealType.LUNCH,
            rating=5,
            category="quality",
            comments="Wednesday Vegetable Biryani & Gulab Jamun was delicious and well prepared!",
        ),
        MessFeedback(
            student_id=student2.id,
            meal_type=MealType.BREAKFAST,
            rating=4,
            category="cleanliness",
            comments="Dining tables and water filters were clean and sanitized.",
        ),
        MessFeedback(
            student_id=student3.id,
            meal_type=MealType.DINNER,
            rating=3,
            category="timings",
            comments="Dinner service started 10 minutes late on Thursday.",
        ),
    ]
    db.add_all(feedbacks)
    db.commit()

    # 12. Inventory Tracking
    inventory = [
        InventoryItem(item_name="Single Wooden Study Cots", category=ItemCategory.FURNITURE, block_id=block_a.id, room_number="All Rooms", quantity=48, condition=ItemCondition.GOOD),
        InventoryItem(item_name="Ergonomic Study Desks", category=ItemCategory.FURNITURE, block_id=block_a.id, room_number="All Rooms", quantity=48, condition=ItemCondition.GOOD),
        InventoryItem(item_name="Study Chairs with Cushion", category=ItemCategory.FURNITURE, block_id=block_a.id, room_number="All Rooms", quantity=48, condition=ItemCondition.NEEDS_REPAIR, remarks="4 chairs need armrest bolt tightening"),
        InventoryItem(item_name="Crompton 1200mm Ceiling Fans", category=ItemCategory.ELECTRICAL, block_id=block_a.id, room_number="Floor 1 & 2", quantity=24, condition=ItemCondition.GOOD),
        InventoryItem(item_name="Cisco Dual-Band Wi-Fi Access Points", category=ItemCategory.FACILITY, block_id=block_a.id, room_number="Corridors", quantity=6, condition=ItemCondition.GOOD),
        InventoryItem(item_name="Aquaguard Commercial RO Water Dispenser", category=ItemCategory.FACILITY, block_id=block_a.id, room_number="1st Floor Common Area", quantity=2, condition=ItemCondition.GOOD),
        InventoryItem(item_name="Steel Wardrobes with Locker", category=ItemCategory.FURNITURE, block_id=block_b.id, room_number="Bhavani Rooms", quantity=36, condition=ItemCondition.GOOD),
        InventoryItem(item_name="Sanitization & Cleaning Chemical Buckets", category=ItemCategory.SUPPLIES, block_id=block_a.id, room_number="Housekeeping Store", quantity=15, condition=ItemCondition.GOOD),
    ]
    db.add_all(inventory)
    db.commit()

    # 13. Notices & Important Updates
    notices = [
        Notice(
            title="Hostel Night Roll Call Timings Strict Adherence",
            content="All hostel residents must report to their respective floors by 08:30 PM sharp for biometric and manual roll call attendance. Any late entry requires prior warden approval.",
            category="Attendance",
            priority=NoticePriority.URGENT,
            posted_by="Chief Warden Office",
            created_at=now - timedelta(hours=5),
        ),
        Notice(
            title="Wednesday Special Dinner Menu Update",
            content="On account of college day celebrations, special feast dinner will be served tomorrow from 07:30 PM to 09:30 PM in the central mess dining hall.",
            category="Mess",
            priority=NoticePriority.HIGH,
            posted_by="Mess Committee",
            created_at=now - timedelta(days=1),
        ),
        Notice(
            title="Semester Hostel & Mess Fee Clearance Reminder",
            content="Students with pending semester fees are advised to clear dues before the 15th of this month to avoid late registration penalties.",
            category="Finance",
            priority=NoticePriority.NORMAL,
            posted_by="Accounts Department",
            created_at=now - timedelta(days=2),
        ),
    ]
    db.add_all(notices)
    db.commit()

    print("[SUCCESS] Comprehensive MSEC Hostel data successfully seeded!")
