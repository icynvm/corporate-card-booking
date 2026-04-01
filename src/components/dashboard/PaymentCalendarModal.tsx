import React, { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from "date-fns";
import { RequestPayment, RequestRecord } from "@/lib/types";

interface PaymentCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentCalendarModal: React.FC<PaymentCalendarModalProps> = ({ isOpen, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [notifying, setNotifying] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // Clear stale state when day changes or modal opens
  useEffect(() => {
    setUploading(null);
    setNotifying(null);
  }, [selectedDay, isOpen]);

  useEffect(() => {
    if (isOpen) fetchPayments();
  }, [currentMonth, isOpen]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetch(`/api/payments/calendar?year=${year}&month=${month}`);
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotify = async (paymentId: string) => {
    setNotifying(paymentId);
    try {
      const res = await fetch("/api/payments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentId }),
      });
      if (res.ok) alert("แจ้งเตือนสำเร็จ!");
    } catch (error) {
      alert("แจ้งเตือนล้มเหลว");
    } finally {
      setNotifying(null);
    }
  };

  const handleUploadReceipt = async (requestId: string, monthYear: string, file: File) => {
    if (!file) return;
    setUploading(`${requestId}-${monthYear}`);
    try {
      const formData = new FormData();
      formData.append("requestId", requestId);
      formData.append("monthYear", monthYear);
      formData.append("file", file);

      const res = await fetch("/api/payments/receipt", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchPayments(); // Refresh calendar dots and status
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  // Helper: Get payments for a specific day in this month (arbitrary logic for demo)
  // Real world: installments are monthly, we can show them on the 1st or 15th
  // Helper: Get payments for a specific day in this month
  const getPaymentsForDay = (day: Date) => {
    return payments.filter(p => {
      if (!p.due_date) return false;
      const dueDate = new Date(p.due_date);
      return isSameDay(day, dueDate);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Pane: Calendar */}
        <div className="flex-1 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter">
                Payment <span className="gradient-text">Schedule</span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">Monitoring installments and due dates</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm active:scale-95"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 px-3 min-w-[120px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm active:scale-95"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase text-gray-400 dark:text-gray-600 py-3">{d}</div>
            ))}
            
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="h-20 lg:h-24" />)}
            
            {days.map((day, i) => {
              const dayPayments = getPaymentsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 lg:h-24 border border-gray-50 dark:border-gray-800 rounded-xl p-2 cursor-pointer transition-all relative group
                    ${isSelected ? "bg-brand-50/50 dark:bg-brand-900/20 ring-2 ring-brand-500 shadow-lg z-10" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}
                    ${isToday ? "border-brand-200 dark:border-brand-900" : ""}
                  `}
                >
                  <span className={`text-xs font-bold ${isToday ? "text-brand-600 w-6 h-6 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center -mt-1 -ml-1" : "text-gray-400 dark:text-gray-600"}`}>
                    {format(day, "d")}
                  </span>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dayPayments.slice(0, 3).map((p, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full shadow-sm animate-pulse
                        ${p.status === "PAID" ? "bg-emerald-500" : p.status === "OVERDUE" ? "bg-red-500" : "bg-amber-400"}
                      `} />
                    ))}
                    {dayPayments.length > 3 && <span className="text-[8px] text-gray-400 font-bold">+{dayPayments.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Day Details */}
        <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-800/50 border-l border-gray-100 dark:border-gray-700 p-6 flex flex-col overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-gray-800 dark:text-gray-100 uppercase text-sm">
                Detail <span className="text-gray-400">Section</span>
              </h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                {selectedDay ? format(selectedDay, "EEEE, MMM d") : "Select a date"}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {selectedDay && getPaymentsForDay(selectedDay).length > 0 ? (
              getPaymentsForDay(selectedDay).map((p) => (
                <div key={p.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${p.status === "PAID" ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-tight">{p.requests?.project_name}</span>
                  </div>
                  <div className="text-lg font-black text-gray-800 dark:text-gray-100 leading-tight mb-3">
                    THB {p.amount_due.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase mb-4">
                    <span>Due: {format(selectedDay, "MMM d")}</span>
                    <span className={`px-2 py-0.5 rounded-full ${p.status === "PAID" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {p.status}
                    </span>
                  </div>
                                   {p.status === "PAID" ? (
                    <a 
                      href={p.receipt_file_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-tighter transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      View Receipt
                    </a>
                  ) : (
                    <div className="space-y-2">
                      <button 
                        onClick={() => handleNotify(p.id)}
                        disabled={notifying === p.id}
                        className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-tighter transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {notifying === p.id ? (
                          <div className="w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" /></svg>
                        )}
                        {notifying === p.id ? "Sending..." : "Notify via LINE"}
                      </button>

                      <label className="block">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadReceipt(p.request_id, p.month_year, file);
                          }}
                          disabled={uploading === `${p.request_id}-${p.month_year}`}
                        />
                        <div className={`w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-500 text-gray-500 hover:text-brand-500 rounded-xl text-[10px] font-black uppercase text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${uploading === `${p.request_id}-${p.month_year}` ? "opacity-50" : ""}`}>
                          {uploading === `${p.request_id}-${p.month_year}` ? (
                            <div className="w-3 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                          )}
                          {uploading === `${p.request_id}-${p.month_year}` ? "Uploading..." : "Upload Receipt"}
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                <svg className="w-12 h-12 text-gray-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p className="text-xs font-black uppercase text-gray-400">No scheduled<br />payments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
