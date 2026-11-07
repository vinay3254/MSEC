import React, { useEffect, useState } from 'react';
import { studentService } from '../services/studentService';
import { User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import {
  Users,
  Search,
  Phone,
  Mail,
  Plus,
  ShieldAlert,
  HeartPulse,
  Eye,
  X,
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // View Details Modal
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // New Admission Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    register_number: '',
    department: 'Computer Science & Engg',
    year_of_study: 1,
    parent_name: '',
    parent_phone: '',
    emergency_contact: '',
    blood_group: 'O+',
    address: '',
  });

  const loadStudents = () => {
    setLoading(true);
    studentService
      .getStudents({
        search: search || undefined,
        department: departmentFilter || undefined,
      })
      .then((data) => setStudents(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStudents();
  }, [search, departmentFilter]);

  const handleRegisterAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await studentService.registerStudent({
        ...formData,
        year_of_study: Number(formData.year_of_study),
      });
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        register_number: '',
        department: 'Computer Science & Engg',
        year_of_study: 1,
        parent_name: '',
        parent_phone: '',
        emergency_contact: '',
        blood_group: 'O+',
        address: '',
      });
      loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to enroll student');
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Student & Resident Management
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Manage student profiles, parent emergency contacts, and hostel admission records.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
        >
          <Plus className="w-4 h-4" /> New Hostel Admission
        </button>
      </div>

      {/* Search & Department Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5C5468] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, register number, or email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl outline-none text-[#1A1523] placeholder-[#5C5468] focus:border-[#4E2478] focus:bg-white font-body"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="w-full sm:w-auto text-xs border border-[#E3DEE9] rounded-xl px-3 py-2 bg-[#FAF8FC] text-[#1A1523] focus:outline-none focus:border-[#4E2478] font-body"
        >
          <option value="">All Departments</option>
          <option value="Computer Science & Engg">Computer Science & Engg</option>
          <option value="Electronics & Comm Engg">Electronics & Comm Engg</option>
          <option value="Information Technology">Information Technology</option>
          <option value="Artificial Intelligence & Data Science">AI & Data Science</option>
          <option value="Mechanical Engg">Mechanical Engg</option>
        </select>
      </div>

      {/* Students Table */}
      {loading ? (
        <Loader message="Loading student records & admission files..." />
      ) : students.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-[#5C5468]/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#1A1523] font-heading">No students found</h3>
          <p className="text-xs text-[#5C5468] mt-1 font-body">
            Try adjusting your search filters or enroll a new resident.
          </p>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1A1523]">
              <thead className="bg-[#FAF8FC] border-b border-[#E3DEE9] text-[11px] font-semibold uppercase text-[#5C5468]">
                <tr>
                  <th className="px-6 py-4">Student Name & Email</th>
                  <th className="px-6 py-4">Reg Number</th>
                  <th className="px-6 py-4">Department & Year</th>
                  <th className="px-6 py-4">Parent / Emergency Contact</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DEE9]/70">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#EDE4F5]/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EDE4F5] border border-[#E3DEE9] text-[#4E2478] font-bold text-xs flex items-center justify-center font-heading">
                          {student.full_name ? student.full_name[0] : 'S'}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1A1523]">{student.full_name}</div>
                          <div className="text-[11px] text-[#5C5468] flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-[#5C5468]" /> {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs font-medium text-[#1A1523]">
                      {student.register_number || 'N/A'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-[#1A1523]">{student.department || 'General'}</div>
                      <span className="text-[10px] text-[#5C5468]">
                        Year {student.year_of_study || 1}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {student.parent_phone ? (
                        <div>
                          <p className="font-medium text-[#1A1523]">{student.parent_name || 'Parent'}</p>
                          <p className="text-[11px] text-[#5C5468] flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-[#5C5468]" /> {student.parent_phone}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[#5C5468]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant="accent" className="font-mono font-bold">
                        {student.blood_group || 'O+'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#EDE4F5] hover:bg-[#4E2478] hover:text-white text-[#4E2478] rounded-lg text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Full Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E3DEE9] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E3DEE9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#EDE4F5] border border-[#E3DEE9] text-[#4E2478] font-bold text-lg flex items-center justify-center font-heading">
                  {selectedStudent.full_name[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1523] font-heading">
                    {selectedStudent.full_name}
                  </h3>
                  <p className="text-xs text-[#5C5468] font-mono">
                    Reg No: {selectedStudent.register_number || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-[#5C5468] hover:text-[#F30137] p-1.5 rounded-lg hover:bg-[#FDE2E7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-body">
              <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                <span className="text-[#5C5468] block">Department</span>
                <span className="font-semibold text-[#1A1523] mt-0.5 block">{selectedStudent.department}</span>
              </div>
              <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                <span className="text-[#5C5468] block">Year of Study</span>
                <span className="font-semibold text-[#1A1523] mt-0.5 block">Year {selectedStudent.year_of_study}</span>
              </div>
              <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                <span className="text-[#5C5468] block flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#4E2478]" /> Student Contact
                </span>
                <span className="font-mono text-[#1A1523] mt-0.5 block">{selectedStudent.phone || 'N/A'}</span>
              </div>
              <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                <span className="text-[#5C5468] block flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-[#F30137]" /> Blood Group
                </span>
                <span className="font-bold text-[#F30137] mt-0.5 block">{selectedStudent.blood_group}</span>
              </div>
            </div>

            <div className="p-4 bg-[#FDE2E7]/40 rounded-xl border border-[#FDE2E7] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#F30137] font-heading">
                <ShieldAlert className="w-4 h-4" /> Parent & Emergency Contact
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-body">
                <div>
                  <span className="text-[#5C5468] block">Parent Name:</span>
                  <span className="font-semibold text-[#1A1523]">{selectedStudent.parent_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#5C5468] block">Parent Mobile:</span>
                  <span className="font-mono text-[#1A1523]">{selectedStudent.parent_phone || 'N/A'}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-[#E3DEE9]">
                  <span className="text-[#5C5468] block">24/7 Emergency Line:</span>
                  <span className="font-mono font-bold text-[#F30137]">{selectedStudent.emergency_contact || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9] text-xs font-body">
              <span className="text-[#5C5468] block font-medium">Permanent Residential Address</span>
              <p className="text-[#1A1523] mt-1 leading-relaxed">
                {selectedStudent.address || 'Address on file in hostel admission register'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold font-body"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Student Admission Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-[#E3DEE9] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E3DEE9] pb-3">
              <h2 className="text-base font-bold text-[#1A1523] font-heading">
                New Hostel Resident Admission
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterAdmission} className="mt-4 space-y-4 text-xs font-body">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. S. Vignesh"
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Register Number (USN)</label>
                  <input
                    type="text"
                    required
                    value={formData.register_number}
                    onChange={(e) => setFormData({ ...formData, register_number: e.target.value.toUpperCase() })}
                    placeholder="1ME23IS027"
                    className="mt-1 w-full text-xs font-mono uppercase border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vignesh@msec.edu.in"
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Mobile Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98401 23456"
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-[#1A1523]">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="Computer Science & Engg">Computer Science & Engg</option>
                    <option value="Electronics & Comm Engg">Electronics & Comm Engg</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Artificial Intelligence & Data Science">AI & Data Science</option>
                    <option value="Mechanical Engg">Mechanical Engg</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Year of Study</label>
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({ ...formData, year_of_study: Number(e.target.value) })}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Parent Name</label>
                  <input
                    type="text"
                    required
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    placeholder="Father / Guardian"
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Parent Mobile</label>
                  <input
                    type="text"
                    required
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    placeholder="+91 94440 12345"
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">24/7 Emergency Contact Line</label>
                <input
                  type="text"
                  required
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="+91 94440 99999"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Permanent Residential Address</label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, Pincode"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
                >
                  Register Resident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
