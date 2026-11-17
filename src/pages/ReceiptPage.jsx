import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Grid3X3,
  Users,
  Building2,
  Lock,
  FileDown,
} from 'lucide-react';
import ToothChartModal from '../components/ToothChartModal';
import CustomSelect from '../components/CustomSelect';
import NotificationToast from '../components/NotificationToast';
import ConfirmModal from '../components/ConfirmModal';

const createEmptyWorkItem = () => ({
  workItem: '',
  teethNumber: '',
  unit: 0,
  rate: 0,
  amount: 0,
});

function calculateUnitFromTeeth(text) {
  if (!text || typeof text !== 'string') return 0;
  const cleaned = text.trim();
  if (!cleaned) return 0;

  const set = new Set();
  const segments = cleaned.split(/[|;]/);
  for (const seg of segments) {
    const matchQuad = seg.match(/\b(UR|UL|LR|LL)\b/i);
    if (matchQuad) {
      const quad = matchQuad[1].toUpperCase();
      const rest = seg.slice(seg.indexOf(matchQuad[0]) + matchQuad[0].length).replace(/^[:\s-]+/, '');
      const rangeMatch = rest.match(/([1-8])\s*(?:-|to|\.\.)\s*([1-8])/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let n = min; n <= max; n++) {
          set.add(`${quad}-${n}`);
        }
      }
      const numMatches = rest.match(/\b([1-8])\b/g);
      if (numMatches) {
        for (const nm of numMatches) {
          set.add(`${quad}-${nm}`);
        }
      }
    }
  }

  const directMatches = cleaned.match(/\b(UR|UL|LR|LL)[-\s]?([1-8])\b/gi);
  if (directMatches) {
    for (const dm of directMatches) {
      const q = dm.slice(0, 2).toUpperCase();
      const num = dm.replace(/\D/g, '');
      if (num) set.add(`${q}-${num}`);
    }
  }

  if (set.size === 0) {
    const numbers = cleaned.match(/\b[1-8]\b/g);
    if (numbers && numbers.length > 0) {
      return numbers.length;
    }
  }

  return set.size;
}

export default function ReceiptPage({ onNavigate, editingReceipt, onClearEditing }) {
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [activeToothRowIndex, setActiveToothRowIndex] = useState(null);
  const [initialState, setInitialState] = useState(null);

  // Form State
  const [billNumber, setBillNumber] = useState('5000');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [jobNumber, setJobNumber] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [workItems, setWorkItems] = useState([createEmptyWorkItem()]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [message, setMessage] = useState(null);
  const [deleteRowTarget, setDeleteRowTarget] = useState(null);

  useEffect(() => {
    loadDoctorsAndClinics();
    if (editingReceipt) {
      loadReceiptToForm(editingReceipt);
    } else {
      generateBillNumber();
    }
  }, [editingReceipt]);

  async function loadDoctorsAndClinics() {
    if (!window.api) return;
    try {
      const docRes = await window.api.getDoctors();
      if (docRes.success) {
        setDoctors(docRes.data || []);
      }
      const clinicRes = await window.api.getClinics();
      if (clinicRes.success) {
        setClinics(clinicRes.data || []);
      }
    } catch (err) {
      console.error('Error loading doctors/clinics:', err);
    }
  }

  function loadReceiptToForm(rec) {
    setEditingId(rec.id);
    const bNum = rec.bill_number || rec.billNumber || '';
    const dVal = rec.date || new Date().toISOString().split('T')[0];
    const jNum = rec.job_number || rec.jobNumber || '';
    const docVal = rec.doctor_name || rec.doctorName || '';
    const cVal = rec.clinic_name || rec.clinicName || '';
    const pVal = rec.patient_name || rec.patientName || '';

    setBillNumber(bNum);
    setDate(dVal);
    setJobNumber(jNum);
    setDoctorName(docVal);
    setClinicName(cVal);
    setPatientName(pVal);

    let parsedItems = [createEmptyWorkItem()];
    if (Array.isArray(rec.workItems) && rec.workItems.length > 0) {
      parsedItems = rec.workItems.map(item => {
        const wItem = item.workItem ?? item.work_item ?? '';
        const tNum = item.teethNumber ?? item.teeth_number ?? '';
        const uVal = item.unit !== undefined && item.unit !== null ? item.unit : 0;
        const rVal = item.rate !== undefined && item.rate !== null ? item.rate : 0;
        const aVal = item.amount !== undefined && item.amount !== null ? item.amount : (Number(uVal) * Number(rVal));
        return {
          workItem: wItem,
          work_item: wItem,
          teethNumber: tNum,
          teeth_number: tNum,
          unit: uVal,
          rate: rVal,
          amount: aVal,
        };
      });
    }
    setWorkItems(parsedItems);

    setInitialState(JSON.stringify({
      billNumber: bNum,
      date: dVal,
      jobNumber: jNum,
      doctorName: docVal,
      clinicName: cVal,
      patientName: pVal,
      workItems: parsedItems.map(i => ({
        workItem: i.workItem,
        teethNumber: i.teethNumber,
        unit: !isNaN(parseFloat(i.unit)) ? parseFloat(i.unit) : 0,
        rate: parseFloat(i.rate) || 0,
      })),
    }));

    setMessage({
      type: 'success',
      text: `Loaded Receipt #${bNum} for editing.`,
    });
  }

  async function generateBillNumber() {
    setEditingId(null);
    setInitialState(null);
    try {
      if (window.api?.getNextBillNumber) {
        const res = await window.api.getNextBillNumber();
        if (res && res.success && res.data) {
          setBillNumber(String(res.data));
          return;
        }
      }
      if (window.api?.getReceipts) {
        const res = await window.api.getReceipts();
        if (res && res.success && Array.isArray(res.data)) {
          let maxNum = 4999;
          for (const r of res.data) {
            const raw = String(r.bill_number ?? r.billNumber ?? '').replace(/,/g, '').trim();
            const num = parseInt(raw, 10);
            if (!isNaN(num) && String(num) === raw) {
              if (num > maxNum) maxNum = num;
            }
          }
          setBillNumber(String(maxNum + 1));
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching next bill number:', err);
    }
    setBillNumber((prev) => {
      const num = parseInt(prev, 10);
      return !isNaN(num) ? String(num + 1) : '5000';
    });
  }

  function handleItemChange(index, field, value) {
    setWorkItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      const item = { ...updated[index], [field]: value };

      if (field === 'workItem') item.work_item = value;
      if (field === 'work_item') item.workItem = value;

      if (field === 'teethNumber' || field === 'teeth_number') {
        item.teethNumber = value;
        item.teeth_number = value;
        const autoUnit = calculateUnitFromTeeth(value);
        item.unit = autoUnit;
        const rateVal = parseFloat(item.rate) || 0;
        item.amount = Math.round(autoUnit * rateVal * 100) / 100;
      }

      // Auto-calculate row amount: Unit * Rate
      if (field === 'rate') {
        const unitVal = !isNaN(parseFloat(item.unit)) ? parseFloat(item.unit) : 0;
        const rateVal = parseFloat(value) || 0;
        item.amount = Math.round(unitVal * rateVal * 100) / 100;
      }

      updated[index] = item;
      return updated;
    });
  }

  function addWorkItemRow() {
    setWorkItems((prev) => [...prev, createEmptyWorkItem()]);
  }

  function handleDoctorChange(e, val) {
    const selectedDocName = typeof e === 'string' ? e : (e?.target?.value ?? val ?? '');
    setDoctorName(selectedDocName);
    if (!selectedDocName) return;

    // Auto-select clinic associated with this doctor
    const matchedDoc = doctors.find(
      (d) => d.name.toLowerCase().trim() === selectedDocName.toLowerCase().trim()
    );

    if (matchedDoc) {
      if (matchedDoc.clinic_name && matchedDoc.clinic_name.trim()) {
        const associatedClinic = matchedDoc.clinic_name.trim();
        setClinicName(associatedClinic);
        setMessage({
          type: 'info',
          text: `Auto-selected clinic "${associatedClinic}" for ${matchedDoc.name}`,
        });
      } else {
        // Independent practitioner ("Only Doctor")
        setClinicName('');
      }
    }
  }

  function handleClinicChange(e, val) {
    const selectedClinicName = typeof e === 'string' ? e : (e?.target?.value ?? val ?? '');
    setClinicName(selectedClinicName);
  }

  const doctorOptions = useMemo(() => {
    return doctors.map((d) => ({
      value: d.name,
      label: d.name,
      sublabel: d.clinic_name ? `Clinic: ${d.clinic_name}` : 'Only Doctor',
    }));
  }, [doctors]);

  const clinicOptions = useMemo(() => {
    return clinics.map((c) => ({
      value: c.name,
      label: c.name,
      sublabel: c.doctor_name ? `Dr: ${c.doctor_name}` : 'Only Clinic',
    }));
  }, [clinics]);

  function handleRequestDeleteRow(index) {
    const item = workItems[index];
    const name = (item?.workItem || item?.work_item || '').trim();
    setDeleteRowTarget({
      index,
      name: name || `Work Item #${index + 1}`,
    });
  }

  function confirmRemoveWorkItemRow() {
    if (!deleteRowTarget) return;
    try {
      const { index, name } = deleteRowTarget;
      setWorkItems((prev) => {
        if (prev.length <= 1) {
          return [createEmptyWorkItem()];
        }
        return prev.filter((_, idx) => idx !== index);
      });
      setDeleteRowTarget(null);
      setMessage({
        type: 'success',
        title: 'Action Successful',
        text: `"${name}" removed successfully.`,
      });
    } catch (err) {
      setDeleteRowTarget(null);
      setMessage({
        type: 'error',
        title: 'Action Failed',
        text: err?.message || 'Failed to remove work item.',
      });
    }
  }

  const totalAmount = workItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  async function handleReset() {
    if (onClearEditing) onClearEditing();
    setEditingId(null);
    setInitialState(null);
    await generateBillNumber();
    setDate(new Date().toISOString().split('T')[0]);
    setJobNumber('');
    setDoctorName('');
    setClinicName('');
    setPatientName('');
    setWorkItems([createEmptyWorkItem()]);
    setMessage(null);
  }

  // Determine if minimum required fields to save are satisfied
  const isReadyToSave = Boolean(billNumber?.trim());

  // Detect whether changes have been made
  const hasChanges = useMemo(() => {
    if (editingId && initialState) {
      const current = {
        billNumber: billNumber.trim(),
        date,
        jobNumber: jobNumber.trim(),
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
        patientName: patientName.trim(),
        workItems: workItems.map(item => ({
          workItem: (item.workItem ?? item.work_item ?? '').trim(),
          teethNumber: (item.teethNumber ?? item.teeth_number ?? '').trim(),
          unit: !isNaN(parseFloat(item.unit)) ? parseFloat(item.unit) : 0,
          rate: parseFloat(item.rate) || 0,
        })),
      };
      return JSON.stringify(current) !== initialState;
    }
    return Boolean(
      patientName.trim() ||
      doctorName.trim() ||
      clinicName.trim() ||
      jobNumber.trim() ||
      workItems.some(item => (item.workItem ?? item.work_item ?? '').trim() || (item.teethNumber ?? item.teeth_number ?? '').trim() || (parseFloat(item.rate) || 0) > 0)
    );
  }, [editingId, initialState, billNumber, date, jobNumber, doctorName, clinicName, patientName, workItems]);

  async function handleSaveReceipt(saveAsNew = false) {
    if (!billNumber.trim()) {
      setMessage({ type: 'error', text: 'Bill Number is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const receiptPayload = {
      billNumber: billNumber.trim(),
      date,
      jobNumber: jobNumber.trim(),
      doctorName: doctorName.trim(),
      clinicName: clinicName.trim(),
      patientName: patientName.trim(),
      // Add snake_case aliases for universal database and API compatibility
      bill_number: billNumber.trim(),
      job_number: jobNumber.trim(),
      doctor_name: doctorName.trim(),
      clinic_name: clinicName.trim(),
      patient_name: patientName.trim(),
      workItems: workItems.map(item => {
        const wItem = (item.workItem ?? item.work_item ?? '').trim();
        const tNum = (item.teethNumber ?? item.teeth_number ?? '').trim();
        const uVal = !isNaN(parseFloat(item.unit)) ? parseFloat(item.unit) : 0;
        const rVal = parseFloat(item.rate) || 0;
        const aVal = parseFloat(item.amount !== undefined && item.amount !== null ? item.amount : (uVal * rVal)) || 0;
        return {
          workItem: wItem,
          work_item: wItem,
          teethNumber: tNum,
          teeth_number: tNum,
          unit: uVal,
          rate: rVal,
          amount: aVal,
        };
      }),
      totalAmount,
      total_amount: totalAmount,
      signature: '',
    };

    try {
      const clearFormForNextReceipt = async () => {
        if (onClearEditing) onClearEditing();
        setEditingId(null);
        setInitialState(null);
        await generateBillNumber();
        setDate(new Date().toISOString().split('T')[0]);
        setJobNumber('');
        setDoctorName('');
        setClinicName('');
        setPatientName('');
        setWorkItems([createEmptyWorkItem()]);
      };

      if (window.api) {
        if (editingId && !saveAsNew) {
          const res = await window.api.updateReceipt({ id: editingId, ...receiptPayload });
          if (res.success) {
            const savedBillNumber = billNumber.trim();
            await clearFormForNextReceipt();
            setMessage({ type: 'success', text: `Receipt #${savedBillNumber} updated in database!` });
          } else {
            setMessage({ type: 'error', text: res.error || 'Failed to update receipt' });
          }
        } else {
          // If saving as new copy, fetch fresh sequential bill number
          let finalBillNumber = billNumber.trim();
          if (saveAsNew) {
            try {
              if (window.api?.getNextBillNumber) {
                const nextRes = await window.api.getNextBillNumber();
                if (nextRes?.success && nextRes.data) {
                  finalBillNumber = String(nextRes.data);
                }
              }
            } catch (err) {
              console.error('Error fetching next bill number for new copy:', err);
            }
          }

          const payloadToSave = {
            ...receiptPayload,
            billNumber: finalBillNumber,
            bill_number: finalBillNumber,
          };

          const res = await window.api.saveReceipt(payloadToSave);
          if (res.success) {
            const savedBillNumber = finalBillNumber;
            await clearFormForNextReceipt();
            setMessage({ 
              type: 'success', 
              text: saveAsNew 
                ? `Receipt #${savedBillNumber} saved as a new copy!` 
                : `Receipt #${savedBillNumber} saved successfully to local database!` 
            });
          } else {
            setMessage({ type: 'error', text: res.error || 'Failed to save receipt' });
          }
        }
      } else {
        const savedBillNumber = billNumber.trim();
        await clearFormForNextReceipt();
        setMessage({ 
          type: 'success', 
          text: `Receipt #${savedBillNumber} saved successfully to local database!` 
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    const cleanBill = (billNumber || 'Receipt').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Receipt_${cleanBill}.pdf`;

    setDownloadingPdf(true);
    try {
      if (window.api && (window.api.saveReceiptPdf || window.api.saveReportPdf)) {
        const saveFn = window.api.saveReceiptPdf || window.api.saveReportPdf;
        const res = await saveFn({ defaultFileName: fileName, title: `Save Receipt #${billNumber}` });
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
    <div className="space-y-6 pb-28">
      {/* Top Action Buttons */}
      <div className="no-print flex items-center justify-end gap-2 pb-1">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Start New Blank Receipt"
        >
          <RotateCcw className="w-4 h-4 text-[#86868b]" />
          New Receipt
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] rounded-xl shadow-sm shadow-[#20596E]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          {downloadingPdf ? 'Saving PDF...' : 'Download PDF'}
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-medium text-white bg-[#1d1d1f] hover:bg-black rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
      </div>

      {/* Editing Banner */}
      {editingId && (
        <div className="no-print bg-[#fff8ed] border border-[#ffcf96] text-[#b35900] px-4 py-3 rounded-2xl text-[13px] flex items-center justify-between shadow-sm">
          <span className="font-medium">
            You are editing existing receipt ID <b>{editingId}</b> (Bill #{billNumber}). Use the Save popup panel at the bottom to apply changes.
          </span>
          <button
            onClick={handleReset}
            className="text-[#b35900] underline font-semibold ml-2 hover:text-amber-950"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* Floating Action Notification Pop-up Card */}
      <NotificationToast
        notification={message}
        onClose={() => setMessage(null)}
      />

      {/* Apple-style Receipt Canvas / Container */}
      <div className="print-receipt-container bg-white rounded-3xl border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-8 sm:p-10 transition-all">
        {/* Fit Well Dental Lab Official Header Banner */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between border-b-2 border-[#1d1d1f] pb-6 mb-8 gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 text-center sm:text-left">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1d1d1f] uppercase leading-none font-sans">
                FIT WELL
              </h1>
              <div className="text-base sm:text-lg font-bold italic text-[#20596E] tracking-wide mt-1">
                Dental Lab
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden sm:block h-12 w-[2px] bg-[#1d1d1f]/40"></div>

            <div className="text-xs sm:text-[13px] text-[#1d1d1f] leading-relaxed">
              <p className="font-semibold text-[#1d1d1f]">
                Anna Nagar, Madurai - 625 020.
              </p>
              <p className="mt-0.5 font-medium text-[#424245]">
                <span className="font-bold text-[#1d1d1f]">Mob :</span> 9894626727, 9043559065
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#20596E] bg-[#20596E]/10 px-3 py-1 rounded-xl mb-1">
              Cash Bill
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
              Dental Laboratory
            </p>
          </div>
        </div>

        {/* Receipt Information & Entity Details: Unified 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 pb-8 border-b border-[#e5e5ea]">
          {/* Bill Number */}
          <div>
            <div className="flex items-center justify-between h-4 mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                <span>Bill Number</span>
                <span className="no-print text-[10px] font-medium lowercase tracking-normal px-1.5 py-0.5 rounded bg-[#f2f2f7] text-[#6e6e73] border border-[#e5e5ea]">
                  auto
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={billNumber}
                readOnly
                tabIndex={-1}
                placeholder="5000"
                title="Bill number is autofilled starting from 5000 and cannot be edited"
                className="w-full h-11 px-3.5 pr-9 text-[14px] font-semibold font-mono bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[#1d1d1f] cursor-not-allowed select-all focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
              />
              <div className="no-print absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#86868b]" title="Auto-filled and locked">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <div className="flex items-center justify-between h-4 mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                Date
              </label>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3.5 text-[14px] font-semibold bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
            />
          </div>

          {/* Job Number */}
          <div>
            <div className="flex items-center justify-between h-4 mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                Job Number
              </label>
            </div>
            <input
              type="text"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full h-11 px-3.5 text-[14px] font-semibold bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
            />
          </div>

          {/* Doctor's Name */}
          <div>
            <div className="flex items-center justify-between h-4 mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                Doctor's Name
              </label>
              <button
                type="button"
                onClick={() => onNavigate('doctors-clinics', { tab: 'doctors' })}
                className="no-print text-[11px] text-[#20596E] hover:underline font-semibold cursor-pointer"
              >
                + Add Doctor
              </button>
            </div>
            <div>
              <CustomSelect
                value={doctorName}
                onChange={handleDoctorChange}
                options={doctorOptions}
                placeholder="Select Doctor"
                icon={Users}
                size="lg"
                creatable={true}
                clearable={Boolean(doctorName)}
                searchPlaceholder="Search or type new doctor..."
              />
            </div>
            {doctorName && !clinicName && (
              <p className="no-print text-[11px] font-medium text-[#20596E] mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20596E]"></span>
                Mode: Only Doctor (Independent)
              </p>
            )}
          </div>

          {/* Clinic Name */}
          <div>
            <div className="flex items-center justify-between h-4 mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                Clinic Name
              </label>
              <button
                type="button"
                onClick={() => onNavigate('doctors-clinics', { tab: 'clinics' })}
                className="no-print text-[11px] text-[#20596E] hover:underline font-semibold cursor-pointer"
              >
                + Add Clinic
              </button>
            </div>
            <div>
              <CustomSelect
                value={clinicName}
                onChange={handleClinicChange}
                options={clinicOptions}
                placeholder="Select Clinic"
                icon={Building2}
                size="lg"
                creatable={true}
                clearable={Boolean(clinicName)}
                searchPlaceholder="Search or type new clinic..."
              />
            </div>
            {!doctorName && clinicName && (
              <p className="no-print text-[11px] font-medium text-[#20596E] mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20596E]"></span>
                Mode: Only Clinic (Facility)
              </p>
            )}
            {doctorName && clinicName && (
              <p className="no-print text-[11px] font-medium text-emerald-700 mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Doctor + Clinic Linked
              </p>
            )}
          </div>

          {/* Patient Name */}
          <div>
            <div className="flex items-center justify-between h-4 mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                Patient Name <span className="text-[10px] font-normal lowercase tracking-normal">(optional)</span>
              </label>
            </div>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Jane Doe (optional)"
              className="w-full h-11 px-3.5 text-[14px] font-medium bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Section: Work Items Table */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
              Patient and Work Details
            </h3>
            <button
              type="button"
              onClick={addWorkItemRow}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#20596E] bg-[#20596E]/10 hover:bg-[#20596E]/15 rounded-xl transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>

          <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#f5f5f7] border-b border-[#e5e5ea] text-[11px] font-semibold uppercase text-[#86868b] tracking-wider">
                  <th className="py-3 px-3 border-r border-[#e5e5ea] w-12 text-center">#</th>
                  <th className="py-3 px-3 border-r border-[#e5e5ea] w-64 sm:w-72">Work Item</th>
                  <th className="py-3 px-3 border-r border-[#e5e5ea] min-w-[300px]">Teeth Number</th>
                  <th className="py-3 px-3 border-r border-[#e5e5ea] w-20 text-center">Unit</th>
                  <th className="py-3 px-3 border-r border-[#e5e5ea] w-28 text-right">Rate (Rs.)</th>
                  <th className="py-3 px-3 border-r border-[#e5e5ea] w-32 text-right">Amount (Rs.)</th>
                  <th className="no-print py-3 px-2 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f7]">
                {workItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#fbfbfd] transition-colors">
                    <td className="py-2.5 px-3 border-r border-[#e5e5ea] text-center font-mono text-xs text-[#86868b]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-[#e5e5ea] w-64 sm:w-72">
                      <input
                        type="text"
                        value={item.workItem ?? item.work_item ?? ''}
                        onChange={(e) => handleItemChange(idx, 'workItem', e.target.value)}
                        placeholder="e.g. Zirconia Crown / Ceramic"
                        className="w-full h-9 px-2.5 text-sm font-medium bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#20596E]/30 focus:bg-white rounded-lg transition-all placeholder:text-[#86868b] text-[#1d1d1f]"
                      />
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-[#e5e5ea] min-w-[300px]">
                      <div className="flex items-center gap-1.5 h-9 px-2 bg-transparent rounded-lg focus-within:ring-1 focus-within:ring-[#20596E]/30 focus-within:bg-white transition-all">
                        <input
                          type="text"
                          value={item.teethNumber ?? item.teeth_number ?? ''}
                          onChange={(e) => handleItemChange(idx, 'teethNumber', e.target.value)}
                          placeholder="Select teeth"
                          className="w-full text-xs font-mono font-medium bg-transparent border-0 focus:outline-none text-[#1d1d1f] placeholder:text-[#86868b]"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveToothRowIndex(idx)}
                          className="no-print p-1 text-[#20596E] hover:bg-[#20596E]/10 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                          title="Open Tooth Chart Graph (Palmer Notation)"
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-[#e5e5ea] w-20 text-center">
                      <div className="h-9 flex items-center justify-center font-mono font-bold text-sm text-[#1d1d1f] select-none">
                        {item.unit !== undefined && item.unit !== null ? item.unit : 0}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-[#e5e5ea]">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-full h-9 px-2.5 text-sm text-right font-mono font-semibold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#20596E]/30 focus:bg-white rounded-lg transition-all text-[#1d1d1f]"
                      />
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#e5e5ea]">
                      <div className="h-9 px-3 flex items-center justify-end font-mono font-bold text-sm text-[#1d1d1f]">
                        {(item.amount || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="no-print py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteRow(idx)}
                        className="p-1.5 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-xl transition-colors inline-flex items-center justify-center cursor-pointer active:scale-95"
                        title="Remove work item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Summary & Total Amount */}
        <div className="border border-[#e5e5ea] rounded-2xl p-6 bg-[#fbfbfd] mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">
              Payment Summary
            </span>
            <p className="text-xs text-[#86868b] mt-0.5">
              Calculated total from all work item units and rates
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868b] block">
              Total Amount
            </span>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1d1d1f] mt-1 font-mono">
              Rs. {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Fit Well Official Sign-off & Authorized Signature Field */}
        <div className="mt-8 pt-6 border-t border-[#e5e5ea] flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
          <div className="text-xs text-[#86868b] text-center sm:text-left">
            <p className="font-semibold text-[#1d1d1f]">FIT WELL Dental Lab</p>
            <p className="mt-0.5">Anna Nagar, Madurai - 625 020. | Mob: 9894626727, 9043559065</p>
            <p className="mt-0.5 text-[11px] text-[#86868b]">Official Laboratory Cash Bill</p>
          </div>
          <div className="text-center sm:text-right">
            <div className="w-52 border-b-2 border-[#1d1d1f] mb-2 ml-auto"></div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1d1d1f]">
              FOR FIT WELL DENTAL LAB
            </p>
            <p className="text-[10px] text-[#86868b] font-medium">Authorized Signature</p>
          </div>
        </div>
      </div>

      {/* Bottom-Side Floating Action Popup for Save */}
      <div className="no-print fixed bottom-5 left-0 right-0 sm:left-64 z-40 flex justify-center px-4 pointer-events-none">
        <div className="apple-bottom-popup pointer-events-auto bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)] rounded-2xl px-5 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start gap-3 sm:gap-4 w-auto max-w-full transition-all">
          
          {/* Left: Status & Receipt Info */}
          <div className="flex items-center gap-2.5 text-xs">
            {editingId ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-semibold bg-[#20596E]/10 text-[#20596E]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#20596E] animate-pulse"></span>
                  Editing #{billNumber}
                </span>
                {hasChanges && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-xl font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Unsaved
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-xl font-semibold bg-[#20596E]/10 text-[#20596E]">
                  Receipt #{billNumber}
                </span>
                {isReadyToSave ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium text-amber-700 bg-amber-50 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Bill # required
                  </span>
                )}
              </div>
            )}

            {patientName.trim() ? (
              <>
                <span className="text-[#d2d2d7] hidden md:inline">•</span>
                <span className="hidden md:inline-block truncate max-w-[130px] text-[#6e6e73]">
                  Patient: <b className="text-[#1d1d1f] font-semibold">{patientName.trim()}</b>
                </span>
              </>
            ) : null}

            <span className="text-[#d2d2d7] hidden sm:inline">•</span>
            <span className="text-[#6e6e73] whitespace-nowrap">
              Total: <span className="font-mono font-bold text-sm text-[#1d1d1f]">Rs. {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </span>
          </div>

          {/* Subtle Vertical Divider */}
          <div className="h-6 w-[1px] bg-[#e5e5ea] hidden sm:block flex-shrink-0"></div>

          {/* Right: Save Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
            {editingId ? (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-xl transition-all cursor-pointer"
                  title="Cancel editing and start blank receipt"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReceipt(true)}
                  disabled={saving || !isReadyToSave}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1d1d1f] bg-white border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] active:bg-[#e5e5ea] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                  title="Save current changes as a new copy"
                >
                  Save as Copy
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReceipt(false)}
                  disabled={saving || !isReadyToSave}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] rounded-xl shadow-md shadow-[#20596E]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {saving ? 'Updating...' : 'Update'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-xl transition-all cursor-pointer"
                  title="Clear all fields"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReceipt(false)}
                  disabled={saving || !isReadyToSave}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] rounded-xl shadow-md shadow-[#20596E]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                  title="Save receipt to database"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Receipt'}
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Dental Palmer Tooth Chart Modal */}
      <ToothChartModal
        isOpen={activeToothRowIndex !== null}
        initialValue={
          activeToothRowIndex !== null
            ? (workItems[activeToothRowIndex]?.teethNumber || workItems[activeToothRowIndex]?.teeth_number || '')
            : ''
        }
        initialUnit={
          activeToothRowIndex !== null
            ? (workItems[activeToothRowIndex]?.unit ?? 0)
            : 0
        }
        onApply={({ teethNumber, unitCount }) => {
          if (activeToothRowIndex !== null) {
            setWorkItems((prev) => {
              const updated = [...prev];
              if (!updated[activeToothRowIndex]) return prev;
              const item = { ...updated[activeToothRowIndex] };
              item.teethNumber = teethNumber;
              item.teeth_number = teethNumber;
              const autoUnit = (unitCount !== undefined && unitCount !== null) ? unitCount : calculateUnitFromTeeth(teethNumber);
              item.unit = autoUnit;
              const rateVal = parseFloat(item.rate) || 0;
              item.amount = Math.round(autoUnit * rateVal * 100) / 100;
              updated[activeToothRowIndex] = item;
              return updated;
            });
            setActiveToothRowIndex(null);
          }
        }}
        onClose={() => setActiveToothRowIndex(null)}
      />

      {/* Delete Row Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteRowTarget)}
        title="Delete Work Item"
        subtitle="Work Item Removal"
        message={
          deleteRowTarget ? (
            <span>
              Are you sure you want to remove{' '}
              <span className="font-semibold text-[#1d1d1f] px-1.5 py-0.5 bg-[#f5f5f7] border border-[#e5e5ea] rounded-md">
                {deleteRowTarget.name}
              </span>{' '}
              from this receipt?
            </span>
          ) : (
            ''
          )
        }
        confirmText="Delete Item"
        cancelText="Cancel"
        variant="danger"
        warningNotice="This work item row will be removed from the receipt."
        onConfirm={confirmRemoveWorkItemRow}
        onCancel={() => setDeleteRowTarget(null)}
      />
    </div>
  );
}
