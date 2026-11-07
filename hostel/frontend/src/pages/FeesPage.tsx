import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { FeeRecord } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Printer,
  X,
} from 'lucide-react';

export const FeesPage: React.FC = () => {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Payment Modal
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState('');

  // Receipt Modal
  const [receiptRecord, setReceiptRecord] = useState<FeeRecord | null>(null);

  const loadFees = () => {
    setLoading(true);
    hostelService
      .getFees({ status: statusFilter || undefined })
      .then((data) => setFees(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFees();
  }, [statusFilter]);

  const handleOpenPayment = (fee: FeeRecord) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.total_amount - fee.paid_amount);
    setTransactionRef(`TXN_MSEC_${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;

    try {
      await hostelService.recordFeePayment(selectedFee.id, {
        paid_amount: Number(paymentAmount),
        transaction_ref: transactionRef,
      });
      setSelectedFee(null);
      loadFees();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record payment');
    }
  };

  const totalBilled = fees.reduce((acc, f) => acc + f.total_amount, 0);
  const totalCollected = fees.reduce((acc, f) => acc + f.paid_amount, 0);
  const totalPending = totalBilled - totalCollected;
  const overdueCount = fees.filter((f) => f.status === 'overdue').length;

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Hostel & Mess Fee Management
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Fee structure schedules, student dues, electronic receipts, and transaction history.
          </p>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL BILLED FEES"
          value={`₹${(totalBilled / 1000).toFixed(0)}k`}
          subtitle="Semester allocation"
          icon={CreditCard}
          iconBg="bg-[#EDE4F5]"
          iconColor="text-[#4E2478]"
          iconBorder="border-[#EDE4F5]"
        />
        <StatCard
          title="FEES COLLECTED"
          value={`₹${(totalCollected / 1000).toFixed(0)}k`}
          subtitle={`${totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : 0}% recovery rate`}
          icon={CheckCircle}
          iconBg="bg-[#E8F5EF]"
          iconColor="text-[#1C8A5C]"
          iconBorder="border-[#b5e2ce]"
        />
        <StatCard
          title="OUTSTANDING DUES"
          value={`₹${(totalPending / 1000).toFixed(0)}k`}
          subtitle="Pending collection"
          icon={Clock}
          iconBg="bg-[#FCF3E6]"
          iconColor="text-[#D98B16]"
          iconBorder="border-[#fae3be]"
        />
        <StatCard
          title="OVERDUE ACCOUNTS"
          value={overdueCount}
          subtitle="Exceeded deadline"
          icon={AlertTriangle}
          iconBg="bg-[#FDE2E7]"
          iconColor="text-[#F30137]"
          iconBorder="border-[#f8bcc7]"
        />
      </div>

      {/* Fee Structure Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs">
          <p className="text-[10px] font-semibold uppercase text-[#5C5468] font-body">Annual Accommodation Fee</p>
          <p className="text-xl font-bold text-[#1A1523] mt-1 font-heading">₹45,000 / Sem</p>
          <p className="text-xs text-[#5C5468] mt-0.5 font-body">Includes Room, Electricity, Wi-Fi & Water</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs">
          <p className="text-[10px] font-semibold uppercase text-[#5C5468] font-body">Dining & Mess Fee</p>
          <p className="text-xl font-bold text-[#1A1523] mt-1 font-heading">₹25,000 / Sem</p>
          <p className="text-xs text-[#5C5468] mt-0.5 font-body">Includes 4 Daily Meals & Sunday Feasts</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs">
          <p className="text-[10px] font-semibold uppercase text-[#5C5468] font-body">Caution Deposit</p>
          <p className="text-xl font-bold text-[#1A1523] mt-1 font-heading">₹5,000 (Refundable)</p>
          <p className="text-xs text-[#5C5468] mt-0.5 font-body">One-time hostel admission security</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['', 'pending', 'overdue', 'paid'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition font-body ${
              statusFilter === st
                ? 'bg-[#4E2478] text-white shadow-2xs'
                : 'bg-white text-[#5C5468] border border-[#E3DEE9] hover:bg-[#EDE4F5]'
            }`}
          >
            {st ? `${st} Dues` : 'All Fee Records'}
          </button>
        ))}
      </div>

      {/* Fees Table */}
      {loading ? (
        <Loader message="Loading hostel fee dues and collections..." />
      ) : fees.length === 0 ? (
        <Card className="text-center py-12">
          <Receipt className="w-12 h-12 text-[#5C5468]/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#1A1523] font-heading">No fee records found</h3>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1A1523] font-body">
              <thead className="bg-[#FAF8FC] border-b border-[#E3DEE9] text-[11px] font-semibold uppercase text-[#5C5468]">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Fee Head</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Paid / Balance</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DEE9]/70">
                {fees.map((f) => {
                  const balance = f.total_amount - f.paid_amount;
                  return (
                    <tr key={f.id} className="hover:bg-[#EDE4F5]/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-[#1A1523]">
                          {f.student?.full_name || `#${f.student_id}`}
                        </div>
                        <span className="text-[10px] font-mono text-[#5C5468]">
                          {f.student?.register_number}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="capitalize font-semibold text-[#4E2478]">
                          {f.fee_type.replace('_', ' ')}
                        </span>
                        <span className="block text-[10px] text-[#5C5468]">{f.academic_year}</span>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-[#1A1523] font-heading">
                        ₹{f.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-[#1C8A5C] font-semibold">
                          ₹{f.paid_amount.toLocaleString()}
                        </span>{' '}
                        /{' '}
                        <span
                          className={balance > 0 ? 'text-[#F30137] font-semibold' : 'text-[#5C5468]'}
                        >
                          ₹{balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[#5C5468]">
                        {new Date(f.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            f.status === 'paid'
                              ? 'success'
                              : f.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                          className="capitalize"
                        >
                          {f.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {f.status !== 'paid' ? (
                            <button
                              onClick={() => handleOpenPayment(f)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-lg text-xs font-semibold transition shadow-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Collect Fee
                            </button>
                          ) : (
                            <button
                              onClick={() => setReceiptRecord(f)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#EDE4F5] hover:bg-[#4E2478] hover:text-white text-[#4E2478] rounded-lg text-xs font-semibold transition"
                            >
                              <Receipt className="w-3.5 h-3.5" /> Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedFee && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <h3 className="text-base font-bold text-[#1A1523] font-heading">
              Record Hostel Fee Receipt
            </h3>
            <p className="text-xs text-[#5C5468] mt-1 font-body">
              Payment towards {selectedFee.fee_type.replace('_', ' ')} for{' '}
              <strong>{selectedFee.student?.full_name}</strong>
            </p>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Amount to Collect (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedFee.total_amount - selectedFee.paid_amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="mt-1 w-full text-sm border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] font-semibold text-[#1A1523] outline-none focus:border-[#4E2478]"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="mt-1 w-full text-xs font-mono border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] outline-none focus:border-[#4E2478]"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setSelectedFee(null)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1C8A5C] hover:bg-[#156e49] text-white rounded-xl font-semibold shadow-xs"
                >
                  Confirm & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Printable Receipt Modal */}
      {receiptRecord && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3DEE9] space-y-4 text-xs font-body">
            <div className="flex justify-between items-start border-b border-[#E3DEE9] pb-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#4E2478]">Meenakshi Sundararajan Engg College</p>
                <h3 className="text-base font-bold text-[#1A1523] font-heading mt-0.5">Official Hostel Fee Receipt</h3>
                <p className="text-[10px] text-[#5C5468] font-mono mt-0.5">Receipt #{receiptRecord.transaction_ref || 'TXN_MSEC_98124'}</p>
              </div>
              <button onClick={() => setReceiptRecord(null)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAF8FC] p-3.5 rounded-xl border border-[#E3DEE9] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5C5468]">Student Name:</span>
                <span className="font-semibold text-[#1A1523]">{receiptRecord.student?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5468]">Register Number:</span>
                <span className="font-mono text-[#1A1523]">{receiptRecord.student?.register_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5468]">Fee Category:</span>
                <span className="capitalize font-semibold text-[#4E2478]">{receiptRecord.fee_type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5468]">Academic Year:</span>
                <span className="text-[#1A1523]">{receiptRecord.academic_year}</span>
              </div>
              <div className="flex justify-between border-t border-[#E3DEE9] pt-2">
                <span className="text-[#5C5468]">Total Paid Amount:</span>
                <span className="text-base font-bold text-[#1C8A5C] font-heading">₹{receiptRecord.paid_amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#1C8A5C] bg-[#E8F5EF] p-2.5 rounded-xl border border-[#b5e2ce]">
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle className="w-4 h-4 text-[#1C8A5C]" /> Paid & Cleared in Full
              </span>
              <span>{new Date(receiptRecord.due_date).toLocaleDateString()}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
