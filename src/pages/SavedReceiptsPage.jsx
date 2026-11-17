import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  Edit3, 
  Trash2, 
  Eye, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Plus,
  ChevronRight,
  Users,
  Building2,
  FileDown
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import ConfirmModal from '../components/ConfirmModal';
import NotificationToast from '../components/NotificationToast';

export default function SavedReceiptsPage({ onNavigate, onEditReceipt }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterClinic, setFilterClinic] = useState('');
  const [dbDoctors, setDbDoctors] = useState([]);
  const [dbClinics, setDbClinics] = useState([]);
  const [message, setMessage] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    setLoading(true);
    try {
      if (window.api) {
        const res = await window.api.getReceipts();
        if (res.success) {
          setReceipts(res.data || []);
        } else {
          setMessage({ type: 'error', text: res.error || 'Failed to load receipts' });
        }

        const docRes = await window.api.getDoctors();
        if (docRes.success) setDbDoctors(docRes.data || []);

        const clinicRes = await window.api.getClinics();
        if (clinicRes.success) setDbClinics(clinicRes.data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function confirmDeleteReceipt() {
    if (!deleteTarget) return;
    const { id, billNo } = deleteTarget;
    setDeleteTarget(null);

    try {
      if (window.api) {
        const res = await window.api.deleteReceipt(id);
        if (res.success) {
          setMessage({ type: 'success', text: `Receipt #${billNo} deleted successfully.` });
          await loadReceipts();
          if (selectedReceipt?.id === id) {
            setSelectedReceipt(null);
          }
        } else {
          setMessage({ type: 'error', text: res.error || 'Failed to delete receipt' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  const filteredReceipts = receipts.filter((r) => {
    const term = searchTerm.toLowerCase().trim();
    const jobNum = String(r.job_number ?? r.jobNumber ?? '');
    const billNum = String(r.bill_number ?? r.billNumber ?? '');
    const patName = String(r.patient_name ?? r.patientName ?? '');
    const docName = String(r.doctor_name ?? r.doctorName ?? '');
    const clinName = String(r.clinic_name ?? r.clinicName ?? '');

    const matchesSearch =
      !term ||
      jobNum.toLowerCase().includes(term) ||
      billNum.toLowerCase().includes(term) ||
      patName.toLowerCase().includes(term) ||
      docName.toLowerCase().includes(term) ||
      clinName.toLowerCase().includes(term) ||
      (Array.isArray(r.workItems) &&
        r.workItems.some(
          (w) =>
            String(w.work_item ?? w.workItem ?? '').toLowerCase().includes(term) ||
            String(w.teeth_number ?? w.teethNumber ?? '').toLowerCase().includes(term)
        ));

    const matchesDoctor = !filterDoctor
      ? true
      : filterDoctor === '__NONE__'
      ? !docName || docName.trim() === ''
      : docName.toLowerCase() === filterDoctor.toLowerCase();

    const matchesClinic = !filterClinic
      ? true
      : filterClinic === '__NONE__'
      ? !clinName || clinName.trim() === ''
      : clinName.toLowerCase() === filterClinic.toLowerCase();

    return matchesSearch && matchesDoctor && matchesClinic;
  });

  const uniqueDoctors = Array.from(
    new Set([
      ...dbDoctors.map((d) => d.name),
      ...receipts.map((r) => r.doctor_name || r.doctorName)
    ].filter(Boolean))
  ).sort();

  const uniqueClinics = Array.from(
    new Set([
      ...dbClinics.map((c) => c.name),
      ...receipts.map((r) => r.clinic_name || r.clinicName)
    ].filter(Boolean))
  ).sort();

  const doctorOptions = useMemo(() => {
    return [
      {
        value: '',
        label: 'All Doctors',
        count: uniqueDoctors.length,
      },
      {
        value: '__NONE__',
        label: 'No Doctor Assigned (Hospital Only)',
      },
      ...uniqueDoctors.map((doc) => ({
        value: doc,
        label: doc,
      })),
    ];
  }, [uniqueDoctors]);

  const clinicOptions = useMemo(() => {
    return [
      {
        value: '',
        label: 'All Clinics',
        count: uniqueClinics.length,
      },
      {
        value: '__NONE__',
        label: 'No Clinic Assigned (Doctor Only)',
      },
      ...uniqueClinics.map((c) => ({
        value: c,
        label: c,
      })),
    ];
  }, [uniqueClinics]);

  function handlePrintSelected() {
    window.print();
  }

  async function handleDownloadPdfSelected() {
    if (!selectedReceipt) return;

    const billNo = (selectedReceipt.bill_number || selectedReceipt.billNumber || 'Receipt').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Receipt_${billNo}.pdf`;

    setDownloadingPdf(true);
    try {
      if (window.api && (window.api.saveReceiptPdf || window.api.saveReportPdf)) {
        const saveFn = window.api.saveReceiptPdf || window.api.saveReportPdf;
        const res = await saveFn({ defaultFileName: fileName, title: `Save Receipt #${selectedReceipt.bill_number}` });
        if (res.success) {
          setMessage({ type: 'success', text: `Receipt PDF saved successfully: ${res.filePath}` });
          return;
        } else if (res.canceled) {
          return;
        } else if (res.error) {
          throw new Error(res.error);
        }
      }

      window.print();
      setMessage({ type: 'success', text: 'Print dialog opened. Select "Save as PDF" to save.' });
    } catch (err) {
      console.error('Error saving receipt PDF:', err);
      setMessage({ type: 'error', text: `Failed to save PDF: ${err.message}` });
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-1">
            <span>Archive</span>
            <ChevronRight className="w-3 h-3 text-[#d2d2d7]" />
            <span>Records</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            Saved Receipts
          </h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            Manage, search, preview, print, and audit all Fit Well Dental Lab bills
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReceipts}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] shadow-sm transition-all"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#86868b] ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => onNavigate('receipt')}
            className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-medium text-white bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] rounded-xl shadow-sm shadow-[#20596E]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Receipt
          </button>
        </div>
      </div>

      {/* Floating Action Notification Pop-up Card */}
      <NotificationToast
        notification={message}
        onClose={() => setMessage(null)}
      />

      {/* Confirmation Pop-up Card */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Receipt"
        subtitle="Permanent Action"
        message={
          deleteTarget ? (
            <span>
              Are you sure you want to permanently delete receipt{' '}
              <span className="font-mono font-bold text-[#1d1d1f] px-1.5 py-0.5 bg-[#f5f5f7] border border-[#e5e5ea] rounded-md">
                #{deleteTarget.billNo}
              </span>
              ? This action cannot be undone.
            </span>
          ) : (
            ''
          )
        }
        confirmText="Delete Receipt"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteReceipt}
        onCancel={() => setDeleteTarget(null)}
      />


      {/* Apple Filter & Search Controls */}
      <div className="no-print bg-white rounded-2xl border border-black/[0.06] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Job Number, Bill #, Patient, Doctor..."
              className="w-full pl-10 pr-9 py-2 text-[13px] bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all placeholder:text-[#86868b]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 p-0.5 text-[#86868b] hover:text-[#1d1d1f] rounded-full hover:bg-black/[0.05] transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <CustomSelect
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              options={doctorOptions}
              placeholder={`All Doctors (${uniqueDoctors.length})`}
              icon={Users}
              clearable={Boolean(filterDoctor)}
              searchPlaceholder="Search doctor..."
            />
          </div>

          <div>
            <CustomSelect
              value={filterClinic}
              onChange={(e) => setFilterClinic(e.target.value)}
              options={clinicOptions}
              placeholder={`All Clinics (${uniqueClinics.length})`}
              icon={Building2}
              clearable={Boolean(filterClinic)}
              searchPlaceholder="Search clinic..."
            />
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="no-print bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#86868b]">Loading saved receipts...</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#86868b] mx-auto mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">No receipts found</h3>
            <p className="text-[13px] text-[#86868b] mt-1 max-w-sm mx-auto">
              {receipts.length === 0
                ? "You haven't saved any receipts yet. Create your first receipt from the Receipt Filling page."
                : 'No receipts match your search and filter criteria.'}
            </p>
            {receipts.length === 0 && (
              <button
                onClick={() => onNavigate('receipt')}
                className="mt-4 inline-flex items-center gap-1.5 px-5 py-2 bg-[#20596E] text-white text-[13px] font-medium rounded-xl hover:bg-[#286e88] shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Go to Receipt Filling
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#fbfbfd] border-b border-[#e5e5ea] text-[11px] font-semibold uppercase text-[#86868b] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-32">Bill Number</th>
                  <th className="py-3 px-4 w-28">Date</th>
                  <th className="py-3 px-4 w-24">Job No.</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Clinic</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right w-32">Total Amount</th>
                  <th className="py-3 px-4 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f7]">
                {filteredReceipts.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-[#fbfbfd] transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-xs text-[#86868b]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-xs text-[#1d1d1f]">
                      {rec.bill_number || rec.billNumber}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6e6e73] whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6e6e73] font-mono">
                      {rec.job_number || rec.jobNumber || '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1d1d1f]">
                      {rec.patient_name || rec.patientName}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#1d1d1f]">
                      {(rec.doctor_name || rec.doctorName) || <span className="text-[#86868b] italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#1d1d1f]">
                      {(rec.clinic_name || rec.clinicName) || <span className="text-[#86868b] italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#86868b]">
                      {Array.isArray(rec.workItems) ? `${rec.workItems.length} row(s)` : '0'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1d1d1f]">
                      Rs. {Number(rec.total_amount ?? rec.totalAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedReceipt(rec)}
                          className="p-1.5 text-[#86868b] hover:text-[#20596E] hover:bg-[#20596E]/10 rounded-xl transition-colors"
                          title="View / Print Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (onEditReceipt) onEditReceipt(rec);
                            onNavigate('receipt');
                          }}
                          className="p-1.5 text-[#86868b] hover:text-[#34c759] hover:bg-[#34c759]/10 rounded-xl transition-colors"
                          title="Edit in Form"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: rec.id, billNo: rec.bill_number || rec.billNumber || '' })}
                          className="p-1.5 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-xl transition-colors"
                          title="Delete Receipt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal Preview */}
      {selectedReceipt && (
        <div className="print-modal-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="print-modal-card bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-black/10">
            {/* Modal Controls Bar */}
            <div className="no-print px-6 py-4 bg-[#fbfbfd] border-b border-[#e5e5ea] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#20596E]"></div>
                <span className="font-semibold text-[14px] text-[#1d1d1f]">
                  Receipt #{selectedReceipt.bill_number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdfSelected}
                  disabled={downloadingPdf}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] text-white rounded-xl text-xs font-medium transition-all shadow-sm shadow-[#20596E]/20 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {downloadingPdf ? 'Saving PDF...' : 'Download PDF'}
                </button>
                <button
                  onClick={handlePrintSelected}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-xs font-medium transition-colors cursor-pointer active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
                <button
                  onClick={() => {
                    if (onEditReceipt) onEditReceipt(selectedReceipt);
                    setSelectedReceipt(null);
                    onNavigate('receipt');
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] border border-[#d2d2d7] rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#86868b]" />
                  Edit in Form
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1 text-[#86868b] hover:text-[#1d1d1f] rounded-xl ml-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="print-modal-body p-6 sm:p-8 overflow-y-auto flex-1 bg-[#f5f5f7]">
              <div className="print-receipt-container bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm">
                {/* Fit Well Dental Lab Official Letterhead */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between border-b-2 border-slate-900 pb-4 mb-6 gap-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 text-center sm:text-left">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 uppercase font-sans leading-none">
                        FIT WELL
                      </h2>
                      <div className="text-base sm:text-lg font-bold italic text-[#20596E] tracking-wide mt-1">
                        Dental Lab
                      </div>
                    </div>
                    <div className="hidden sm:block h-12 w-[2px] bg-slate-400"></div>
                    <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      <p className="font-bold text-slate-900">Anna Nagar, Madurai - 625 020.</p>
                      <p className="mt-0.5 text-slate-600">
                        <span className="font-bold text-slate-900">Mob :</span> 9894626727, 9043559065
                      </p>
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#20596E] bg-[#20596E]/10 px-3 py-1 rounded-xl mb-1">
                      Cash Bill
                    </span>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Dental Laboratory
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-4 border-b border-slate-300 text-sm">
                  <div>
                    <span className="block text-xs font-bold uppercase text-slate-500">
                      Bill Number
                    </span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {selectedReceipt.bill_number || selectedReceipt.billNumber}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase text-slate-500">
                      Date
                    </span>
                    <span className="font-semibold text-slate-800">{selectedReceipt.date}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase text-slate-500">
                      Job Number
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedReceipt.job_number || selectedReceipt.jobNumber || '-'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-4 border-b border-slate-300 text-sm">
                  <div>
                    <span className="block text-xs font-bold uppercase text-slate-500">
                      Doctor's Name
                    </span>
                    <span className="font-bold text-slate-900">{(selectedReceipt.doctor_name || selectedReceipt.doctorName) || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase text-slate-500">
                      Clinic Name
                    </span>
                    <span className="font-bold text-slate-900">{(selectedReceipt.clinic_name || selectedReceipt.clinicName) || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase text-slate-500">
                      Patient Name
                    </span>
                    <span className="font-bold text-slate-900">{selectedReceipt.patient_name || selectedReceipt.patientName}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="border border-slate-900 overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-900 text-xs font-bold uppercase text-slate-900">
                          <th className="py-2 px-3 border-r border-slate-900 w-12 text-center">#</th>
                          <th className="py-2 px-3 border-r border-slate-900 w-56">Work Item</th>
                          <th className="py-2 px-3 border-r border-slate-900 min-w-[240px]">Teeth Number</th>
                          <th className="py-2 px-3 border-r border-slate-900 w-16 text-right">Unit</th>
                          <th className="py-2 px-3 border-r border-slate-900 w-24 text-right">Rate (Rs.)</th>
                          <th className="py-2 px-3 text-right w-28">Amount (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {Array.isArray(selectedReceipt.workItems) &&
                          selectedReceipt.workItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 border-r border-slate-900 text-center font-mono text-xs text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-900 font-medium text-slate-900">
                                {item.workItem || item.work_item || '—'}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-900 text-slate-700 font-mono text-xs">
                                {item.teethNumber || item.teeth_number || '-'}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-900 text-right font-mono">
                                {item.unit}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-900 text-right font-mono">
                                {Number(item.rate).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {Number(item.amount).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-slate-900 p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Total Amount
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    Rs. {Number(selectedReceipt.total_amount ?? selectedReceipt.totalAmount ?? 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {/* Official Lab Sign-off & Authorized Signature Field */}
                <div className="mt-8 pt-6 border-t border-slate-300 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
                  <div className="text-xs text-slate-500 text-center sm:text-left">
                    <p className="font-bold text-slate-900 text-sm">FIT WELL Dental Lab</p>
                    <p className="mt-0.5 text-slate-600">Anna Nagar, Madurai - 625 020. | Mob: 9894626727, 9043559065</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Official Laboratory Cash Bill</p>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="w-52 border-b-2 border-slate-900 mb-2 ml-auto"></div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                      FOR FIT WELL DENTAL LAB
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Authorized Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
