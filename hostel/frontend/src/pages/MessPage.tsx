import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { studentService } from '../services/studentService';
import { MessMenu, MessFeedback, User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import {
  UtensilsCrossed,
  Clock,
  Star,
  Plus,
  Sparkles,
  MessageSquare,
  AlertCircle,
  X,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Calendar,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const MessPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'menu' | 'feedback'>('menu');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [menus, setMenus] = useState<MessMenu[]>([]);
  const [feedbacks, setFeedbacks] = useState<MessFeedback[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [fbStudentId, setFbStudentId] = useState<number | ''>('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState('quality');
  const [comments, setComments] = useState('');

  // Edit Menu Modal
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuEditDay, setMenuEditDay] = useState('Monday');
  const [menuEditMeal, setMenuEditMeal] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');
  const [menuEditItems, setMenuEditItems] = useState('');
  const [menuEditTimings, setMenuEditTimings] = useState('12:30 PM - 02:00 PM');
  const [menuEditSpecial, setMenuEditSpecial] = useState(false);

  const loadMessData = () => {
    setLoading(true);
    Promise.all([
      hostelService.getMessMenu(),
      hostelService.getMessFeedback(),
      studentService.getStudents(),
    ])
      .then(([menuData, fbData, sData]) => {
        setMenus(menuData);
        setFeedbacks(fbData);
        setStudents(sData);
        if (sData.length > 0 && !fbStudentId) {
          setFbStudentId(sData[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessData();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbStudentId) return;

    try {
      await hostelService.submitMessFeedback({
        student_id: Number(fbStudentId),
        meal_type: mealType,
        rating,
        category,
        comments,
      });
      setShowFeedbackModal(false);
      setComments('');
      loadMessData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit feedback');
    }
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hostelService.saveMessMenu({
        day_of_week: menuEditDay,
        meal_type: menuEditMeal,
        items: menuEditItems,
        timings: menuEditTimings,
        is_special: menuEditSpecial,
      });
      setShowMenuModal(false);
      loadMessData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update mess menu');
    }
  };

  const dayMenus = menus.filter((m) => m.day_of_week.toLowerCase() === selectedDay.toLowerCase());

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast':
        return Coffee;
      case 'lunch':
        return Sun;
      case 'snacks':
        return Cookie;
      default:
        return Moon;
    }
  };

  const avgRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
      : '4.5';

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Mess & Dining Management
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Weekly 7-day meal schedules, dining timings, student meal reviews, and food complaints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
          >
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" /> Submit Meal Feedback
          </button>
          <button
            onClick={() => setShowMenuModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FAF8FC] border border-[#E3DEE9] text-[#4E2478] rounded-xl text-xs font-semibold transition shadow-2xs font-body"
          >
            <Plus className="w-4 h-4" /> Edit Meal Menu
          </button>
        </div>
      </div>

      {/* Tabs Switcher matching screenshot */}
      <div className="flex border-b border-[#E3DEE9] gap-6">
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition relative font-body inline-flex items-center gap-2 ${
            activeTab === 'menu'
              ? 'text-[#4E2478] border-b-2 border-[#F30137]'
              : 'text-[#5C5468] hover:text-[#1A1523]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Weekly Food Schedule & Timings
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition relative font-body inline-flex items-center gap-2 ${
            activeTab === 'feedback'
              ? 'text-[#4E2478] border-b-2 border-[#F30137]'
              : 'text-[#5C5468] hover:text-[#1A1523]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Student Feedback & Complaints ({feedbacks.length})
        </button>
      </div>

      {/* TAB 1: FOOD MENU */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Day of the Week Pills */}
          <div className="bg-white p-3 rounded-2xl border border-[#E3DEE9] shadow-2xs flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition font-body ${
                  selectedDay === day
                    ? 'bg-[#4E2478] text-white shadow-2xs'
                    : 'bg-[#FAF8FC] text-[#5C5468] hover:bg-[#EDE4F5] hover:text-[#4E2478]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Meals for Selected Day */}
          {loading ? (
            <Loader message="Loading MSEC mess schedule..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['breakfast', 'lunch', 'snacks', 'dinner'].map((mType) => {
                const meal = dayMenus.find((m) => m.meal_type === mType);
                const Icon = getMealIcon(mType);

                return (
                  <div
                    key={mType}
                    className="bg-white rounded-2xl border border-[#E3DEE9] p-5 shadow-2xs hover:border-[#4E2478]/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-[#EDE4F5] rounded-xl text-[#4E2478]">
                            <Icon className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-bold capitalize text-[#1A1523] font-heading">
                            {mType}
                          </h3>
                        </div>
                        {meal?.is_special && (
                          <Badge variant="accent" className="font-semibold text-[10px]">
                            <Sparkles className="w-2.5 h-2.5 mr-1" /> Special Feast
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#5C5468] font-medium mb-3">
                        <Clock className="w-3.5 h-3.5 text-[#4E2478]" />
                        <span>{meal?.timings || 'Standard timing'}</span>
                      </div>

                      <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                        <p className="text-xs text-[#1A1523] font-medium leading-relaxed font-body">
                          {meal?.items || 'Chef choice special dishes prepared fresh.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E3DEE9]/60 flex items-center justify-between text-[11px] text-[#5C5468] font-body">
                      <span>MSEC Central Mess</span>
                      <span className="text-[#1C8A5C] font-semibold">Strict Hygienic</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FEEDBACK & COMPLAINTS */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="AVERAGE DINING RATING"
              value={`${avgRating} / 5.0`}
              subtitle="Overall resident satisfaction"
              icon={Star}
              iconBg="bg-[#FCF3E6]"
              iconColor="text-[#D98B16]"
              iconBorder="border-[#fae3be]"
            />
            <StatCard
              title="TOTAL REVIEWS LOGGED"
              value={feedbacks.length}
              subtitle="Feedback submissions"
              icon={MessageSquare}
              iconBg="bg-[#E9F0F8]"
              iconColor="text-[#2563A6]"
              iconBorder="border-[#c5daf0]"
            />
            <StatCard
              title="FOOD COMPLAINTS"
              value={feedbacks.filter((f) => f.rating <= 2).length}
              subtitle="Escalated to Mess Committee"
              icon={AlertCircle}
              iconBg="bg-[#FDE2E7]"
              iconColor="text-[#F30137]"
              iconBorder="border-[#f8bcc7]"
            />
          </div>

          <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
            <div className="p-4 bg-[#FAF8FC] border-b border-[#E3DEE9]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1523] font-heading">
                Student Dining Reviews & Feedback Log
              </h3>
            </div>

            <div className="divide-y divide-[#E3DEE9]/60">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="p-5 hover:bg-[#EDE4F5]/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EDE4F5] text-[#4E2478] font-bold text-xs flex items-center justify-center font-heading border border-[#E3DEE9]">
                        {fb.student?.full_name ? fb.student.full_name[0] : 'S'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-[#1A1523] font-body">
                          {fb.student?.full_name || `Resident #${fb.student_id}`}
                        </h4>
                        <p className="text-[10px] text-[#5C5468] font-body">
                          Reviewed <strong className="capitalize text-[#4E2478]">{fb.meal_type}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="primary" className="capitalize">
                        {fb.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs font-heading">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{fb.rating} / 5</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#1A1523] mt-2.5 leading-relaxed bg-[#FAF8FC] p-3 rounded-xl border border-[#E3DEE9] font-body">
                    "{fb.comments}"
                  </p>

                  <span className="block text-[10px] text-[#5C5468] mt-2 text-right font-body">
                    {new Date(fb.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading">
                Submit Mess Feedback / Complaint
              </h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Resident Student</label>
                <select
                  value={fbStudentId}
                  onChange={(e) => setFbStudentId(Number(e.target.value))}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.register_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as any)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="snacks">Evening Snacks</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="quality">Food Taste & Quality</option>
                    <option value="cleanliness">Dining Hygiene</option>
                    <option value="quantity">Serving Quantity</option>
                    <option value="timings">Serving Timings</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Rating (1 to 5 Stars)</label>
                <div className="flex gap-2 mt-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-xl border flex items-center justify-center flex-1 transition ${
                        rating >= star
                          ? 'bg-[#EDE4F5] border-[#4E2478] text-[#4E2478]'
                          : 'bg-[#FAF8FC] border-[#E3DEE9] text-[#5C5468]'
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          rating >= star ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Comments & Suggestions</label>
                <textarea
                  rows={3}
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share details about food quality, taste, or any specific issue..."
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading">Configure Mess Menu</h3>
              <button onClick={() => setShowMenuModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="mt-4 space-y-4 text-xs font-body">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Day of the Week</label>
                  <select
                    value={menuEditDay}
                    onChange={(e) => setMenuEditDay(e.target.value)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Meal Type</label>
                  <select
                    value={menuEditMeal}
                    onChange={(e) => setMenuEditMeal(e.target.value as any)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="snacks">Evening Snacks</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Serving Timings</label>
                <input
                  type="text"
                  required
                  value={menuEditTimings}
                  onChange={(e) => setMenuEditTimings(e.target.value)}
                  placeholder="e.g. 12:30 PM - 02:00 PM"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Dishes & Food Items</label>
                <textarea
                  rows={3}
                  required
                  value={menuEditItems}
                  onChange={(e) => setMenuEditItems(e.target.value)}
                  placeholder="e.g. Vegetable Biryani, Raitha, Gulab Jamun, White Rice, Rasam"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="specialCheck"
                  checked={menuEditSpecial}
                  onChange={(e) => setMenuEditSpecial(e.target.checked)}
                  className="rounded text-[#4E2478]"
                />
                <label htmlFor="specialCheck" className="font-medium text-[#1A1523]">
                  Mark as Special Feast Menu
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setShowMenuModal(false)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
