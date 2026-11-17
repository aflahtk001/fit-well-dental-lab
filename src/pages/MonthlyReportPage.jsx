import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  UserRound, 
  Building2, 
  Download, 
  FileDown,
  CheckCircle2, 
  AlertCircle, 
  Receipt as ReceiptIcon,
  Search,
  ChevronRight,
  Users,
  Calendar,
  History,
  Plus,
  X
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import NotificationToast from '../components/NotificationToast';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const shortYear = year.slice(-2);
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    if (!isNaN(dayNum) && !isNaN(monthNum)) {
      return `${dayNum}.${monthNum}.${shortYear}`;
    }
  }
  return dateStr;
}

export default function MonthlyReportPage() {
  const currentDate = new Date();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(currentDate.getFullYear());

  const [filterType, setFilterType] = useState('doctor'); // 'doctor' | 'clinic'
  const [selectedName, setSelectedName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [message, setMessage] = useState(null);

  // Previous month balance state
  const [prevMonth, setPrevMonth] = useState(() => {
    const m = parseInt(currentMonthStr, 10);
    const pm = m > 1 ? m - 1 : 12;
    return String(pm).padStart(2, '0');
  });
  const [prevYear, setPrevYear] = useState(() => {
    const m = parseInt(currentMonthStr, 10);
    const y = parseInt(currentYearStr, 10);
    return String(m > 1 ? y : y - 1);
  });
  const [prevBalanceAmount, setPrevBalanceAmount] = useState('');
  const [appliedPreviousBalances, setAppliedPreviousBalances] = useState([]);

  useEffect(() => {
    loadDoctorsAndClinics();
  }, []);

  useEffect(() => {
    setSelectedName('');
    setReportData([]);
    setHasSearched(false);
    setAppliedPreviousBalances([]);
    setPrevBalanceAmount('');
  }, [filterType]);

  // Keep default previous month in sync when billing month/year changes
  useEffect(() => {
    const m = parseInt(selectedMonth, 10);
    const y = parseInt(selectedYear, 10);
    if (!isNaN(m) && !isNaN(y)) {
      const pm = m > 1 ? m - 1 : 12;
      const py = m > 1 ? y : y - 1;
      setPrevMonth(String(pm).padStart(2, '0'));
      setPrevYear(String(py));
    }
  }, [selectedMonth, selectedYear]);

  function handleAddPreviousBalance() {
    const amountNum = parseFloat(prevBalanceAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid previous balance amount greater than zero.' });
      return;
    }
    const prevMonthLabel = MONTHS.find((m) => m.value === prevMonth)?.label || prevMonth;

    const existingIndex = appliedPreviousBalances.findIndex(
      (item) => item.month === prevMonth && item.year === prevYear
    );
    if (existingIndex !== -1) {
      setMessage({
        type: 'error',
        text: `Previous balance for ${prevMonthLabel} ${prevYear} is already added. Remove it first to change the amount.`,
      });
      return;
    }

    setAppliedPreviousBalances((prev) => [
      ...prev,
      {
        id: `${prevYear}-${prevMonth}-${Date.now()}`,
        month: prevMonth,
        year: prevYear,
        monthLabel: prevMonthLabel,
        amount: amountNum,
      },
    ]);
    setPrevBalanceAmount('');
    setMessage({
      type: 'success',
      text: `Added previous balance of Rs. ${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${prevMonthLabel} ${prevYear}) to statement.`,
    });
  }

  function handleRemoveBalanceItem(id) {
    setAppliedPreviousBalances((prev) => prev.filter((item) => item.id !== id));
    setMessage({
      type: 'success',
      text: 'Previous balance entry removed from statement.',
    });
  }

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

  const connectedClinicName = useMemo(() => {
    if (filterType === 'doctor' && selectedName) {
      const matchedDoc = doctors.find((d) => d.name.toLowerCase() === selectedName.toLowerCase());
      return matchedDoc?.clinic_name || '';
    }
    return '';
  }, [filterType, selectedName, doctors]);

  const connectedDoctorName = useMemo(() => {
    if (filterType === 'clinic' && selectedName) {
      const matchedClinic = clinics.find((c) => c.name.toLowerCase() === selectedName.toLowerCase());
      if (matchedClinic?.doctor_name) return matchedClinic.doctor_name;
      const matchedDocs = doctors.filter((d) => (d.clinic_name || '').toLowerCase() === selectedName.toLowerCase());
      if (matchedDocs.length > 0) {
        return matchedDocs.map((d) => d.name).join(', ');
      }
    }
    return '';
  }, [filterType, selectedName, clinics, doctors]);

  const nameOptions = useMemo(() => {
    if (filterType === 'doctor') {
      return doctors.map((d) => ({
        value: d.name,
        label: d.name,
        sublabel: d.clinic_name ? `Clinic: ${d.clinic_name}` : 'Only Doctor (Independent)',
      }));
    } else {
      return clinics.map((c) => {
        let docStr = c.doctor_name;
        if (!docStr) {
          const matchedDocs = doctors.filter((d) => (d.clinic_name || '').toLowerCase() === c.name.toLowerCase());
          if (matchedDocs.length > 0) docStr = matchedDocs.map((d) => d.name).join(', ');
        }
        return {
          value: c.name,
          label: c.name,
          sublabel: docStr ? `Doctor: ${docStr}` : 'Only Clinic (Facility)',
        };
      });
    }
  }, [filterType, doctors, clinics]);

  const monthOptions = useMemo(() => {
    return MONTHS.map((m) => ({
      value: m.value,
      label: m.label,
    }));
  }, []);

  async function handleGenerateReport(e) {
    if (e) e.preventDefault();
    if (!selectedName) {
      setMessage({
        type: 'error',
        text: `Please select a ${filterType === 'doctor' ? 'Doctor' : 'Clinic'} first.`,
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    setHasSearched(true);

    try {
      if (window.api) {
        const res = await window.api.getMonthlyReport({
          filterType,
          name: selectedName,
          year: selectedYear,
          month: selectedMonth,
        });

        if (res.success) {
          setReportData(res.data || []);
        } else {
          setMessage({ type: 'error', text: res.error || 'Failed to fetch report data' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = reportData.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const totalUnits = reportData.reduce(
    (sum, r) =>
      sum +
      (Array.isArray(r.workItems)
        ? r.workItems.reduce((uSum, item) => uSum + (Number(item.unit) || 0), 0)
        : 0),
    0
  );
  const totalPreviousBalances = appliedPreviousBalances.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const grandTotalAmount = totalAmount + totalPreviousBalances;

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  async function handleDownloadCsv() {
    if (reportData.length === 0) {
      setMessage({ type: 'error', text: 'No report data available to export.' });
      return;
    }

    const typeLabel = filterType === 'doctor' ? 'Doctor' : 'Clinic';
    const otherLabel = filterType === 'doctor' ? 'Clinic Name' : "Doctor Name";

    let csv = `FIT WELL DENTAL LAB - MONTHLY BILLING REPORT\r\n`;
    csv += `Address,Anna Nagar, Madurai - 625 020.\r\n`;
    csv += `Mobile,9894626727 / 9043559065\r\n`;
    csv += `Report Type,By ${typeLabel}\r\n`;
    csv += `Doctor Name,"${filterType === 'doctor' ? selectedName : (connectedDoctorName || '—')}"\r\n`;
    csv += `Clinic Name,"${filterType === 'clinic' ? selectedName : (connectedClinicName || '—')}"\r\n`;
    csv += `Period,${monthLabel} ${selectedYear}\r\n`;
    csv += `Total Receipts,${reportData.length}\r\n`;
    csv += `Total Amount (Rs.),${totalAmount.toFixed(2)}\r\n\r\n`;

    csv += `Date,Bill No.,Works Items,Unit,Rate (Rs.),Amount (Rs.)\r\n`;

    for (const row of reportData) {
      const items = Array.isArray(row.workItems) && row.workItems.length > 0
        ? row.workItems
        : [{ work_item: 'Dental Work', unit: 1, rate: row.total_amount ?? row.totalAmount ?? 0, amount: row.total_amount ?? row.totalAmount ?? 0 }];

      for (const item of items) {
        const jobNo = (row.job_number || row.jobNumber || '').trim();
        const workName = (item.work_item || item.workItem || 'Work Item').trim();
        const itemText = jobNo ? `${jobNo} - ${workName}` : workName;
        const itemUnit = item.unit || 1;
        const itemRate = Number(item.rate || 0);
        const itemAmount = Number(item.amount !== undefined && item.amount !== null ? item.amount : (itemUnit * itemRate));
        csv += `"${formatDisplayDate(row.date)}","${row.bill_number || row.billNumber}","${itemText}",${itemUnit},${itemRate.toFixed(2)},${itemAmount.toFixed(2)}\r\n`;
      }
    }

    if (appliedPreviousBalances.length > 0) {
      csv += `,,,Current Month Subtotal:,,Rs. ${totalAmount.toFixed(2)}\r\n`;
      for (const item of appliedPreviousBalances) {
        csv += `,,,Previous Balance (${item.monthLabel} ${item.year}):,,+ ${Number(item.amount).toFixed(2)}\r\n`;
      }
      csv += `,,,Grand Total Due:,,Rs. ${grandTotalAmount.toFixed(2)}\r\n`;
    } else {
      csv += `,,,Total:,${totalUnits},Rs. ${totalAmount.toFixed(2)}\r\n`;
    }

    const cleanName = selectedName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Monthly_Report_${typeLabel}_${cleanName}_${selectedYear}_${selectedMonth}.csv`;

    try {
      if (window.api && window.api.saveReportCsv) {
        const res = await window.api.saveReportCsv({ defaultFileName: fileName, content: csv });
        if (res.success) {
          setMessage({ type: 'success', text: `Report saved to: ${res.filePath}` });
          return;
        } else if (res.canceled) {
          return;
        }
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ type: 'success', text: `Downloaded ${fileName} successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  const adjustPrintFooter = () => {
    const table = document.getElementById('report-statement-table');
    const footer = document.getElementById('report-print-footer');
    const spacer = document.getElementById('report-print-spacer');
    const header = document.getElementById('report-header-section');
    const meta = document.getElementById('report-meta-section');
    if (!table || !footer || !spacer) return;

    spacer.style.height = '0px';

    const getFullHeight = (el) => {
      if (!el) return 0;
      const style = window.getComputedStyle(el);
      const mt = parseFloat(style.marginTop) || 0;
      const mb = parseFloat(style.marginBottom) || 0;
      return el.offsetHeight + mt + mb;
    };

    // 273mm printable height on A4 (297mm - 24mm margin) at 96 DPI = 1031.81px
    const pageHeightPx = 273 * (96 / 25.4);
    const footerHeight = getFullHeight(footer);
    const buffer = 50;

    let pageUsed = getFullHeight(header) + getFullHeight(meta);

    const thead = table.querySelector('thead');
    const theadHeight = getFullHeight(thead);
    pageUsed += theadHeight;

    const rows = table.querySelectorAll('tbody tr, tfoot tr');
    rows.forEach((row) => {
      const h = row.offsetHeight;
      if (pageUsed + h > pageHeightPx) {
        pageUsed = theadHeight + h;
      } else {
        pageUsed += h;
      }
    });

    const available = pageHeightPx - pageUsed;
    let needed = 0;
    if (available >= (footerHeight + buffer)) {
      needed = available - footerHeight - buffer;
    } else {
      needed = (available + pageHeightPx) - footerHeight - buffer;
    }
    spacer.style.height = `${Math.max(0, Math.floor(needed))}px`;
  };

  useEffect(() => {
    adjustPrintFooter();
    window.addEventListener('beforeprint', adjustPrintFooter);
    return () => window.removeEventListener('beforeprint', adjustPrintFooter);
  }, [reportData, appliedPreviousBalances, hasSearched]);

  async function handleDownloadPdf() {
    if (reportData.length === 0) {
      setMessage({ type: 'error', text: 'No report data available to export.' });
      return;
    }

    adjustPrintFooter();

    const typeLabel = filterType === 'doctor' ? 'Doctor' : 'Clinic';
    const cleanName = selectedName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Monthly_Report_${typeLabel}_${cleanName}_${selectedYear}_${selectedMonth}.pdf`;

    setDownloadingPdf(true);
    try {
      if (window.api && window.api.saveReportPdf) {
        const res = await window.api.saveReportPdf({ defaultFileName: fileName });
        if (res.success) {
          setMessage({ type: 'success', text: `PDF saved successfully: ${res.filePath}` });
          return;
        } else if (res.canceled) {
          return;
        } else if (res.error) {
          throw new Error(res.error);
        }
      }

      // Browser mode fallback
      window.print();
      setMessage({ type: 'success', text: 'Print dialog opened. Select "Save as PDF" to save.' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      setMessage({ type: 'error', text: `Failed to save PDF: ${err.message}` });
    } finally {
      setDownloadingPdf(false);
    }
  }

  function handlePrint() {
    adjustPrintFooter();
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-1">
            <span>Analytics</span>
            <ChevronRight className="w-3 h-3 text-[#d2d2d7]" />
            <span>Monthly Statements</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            Monthly Report
          </h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            Filter, review, print, and export statements by Doctor or Clinic
          </p>
        </div>

        {reportData.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] rounded-xl shadow-sm shadow-[#20596E]/20 transition-all disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {downloadingPdf ? 'Saving PDF...' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#1d1d1f] hover:bg-black rounded-xl shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Notification Pop-up Card */}
      <NotificationToast
        notification={message}
        onClose={() => setMessage(null)}
      />

      {/* Filter Selection Panel (Apple Segmented Style) */}
      <div className="no-print bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6">
        <form onSubmit={handleGenerateReport} className="space-y-4">
          <div className="flex flex-col md:flex-row flex-wrap lg:flex-nowrap items-stretch md:items-end gap-3.5">
            {/* Filter Mode - Apple Segmented Control */}
            <div className="w-full sm:w-48 flex-shrink-0">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                Filter Mode
              </label>
              <div className="h-10 p-1 bg-[#f5f5f7] rounded-xl flex items-center gap-1 border border-[#e5e5ea]">
                <button
                  type="button"
                  onClick={() => setFilterType('doctor')}
                  className={`flex-1 h-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filterType === 'doctor'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                >
                  <UserRound className="w-3.5 h-3.5" />
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('clinic')}
                  className={`flex-1 h-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filterType === 'clinic'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Clinic
                </button>
              </div>
            </div>

            {/* Doctor or Clinic Dropdown */}
            <div className="w-full md:flex-1 md:min-w-[200px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                {filterType === 'doctor' ? 'Doctor Name' : 'Clinic Name'}
              </label>
              <CustomSelect
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                options={nameOptions}
                placeholder={`Select ${filterType === 'doctor' ? 'Doctor' : 'Clinic'}`}
                icon={filterType === 'doctor' ? Users : Building2}
                clearable={Boolean(selectedName)}
                searchPlaceholder={`Search ${filterType === 'doctor' ? 'doctor' : 'clinic'}...`}
              />
            </div>

            {/* Month Selector */}
            <div className="w-full sm:w-36 flex-shrink-0">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                Month
              </label>
              <CustomSelect
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={monthOptions}
                placeholder="Select Month"
                icon={Calendar}
                searchPlaceholder="Search month..."
              />
            </div>

            {/* Year Selector */}
            <div className="w-full sm:w-24 flex-shrink-0">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                Year
              </label>
              <input
                type="number"
                min="2020"
                max="2040"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-10 px-3 text-[13px] text-center font-medium bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
              />
            </div>

            {/* Generate Button */}
            <div className="w-full md:w-auto flex-shrink-0">
              <button
                type="submit"
                disabled={loading || !selectedName}
                className="w-full md:w-auto h-10 flex items-center justify-center gap-2 px-5 bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] text-white text-[13px] font-medium rounded-xl shadow-sm shadow-[#20596E]/20 disabled:opacity-50 transition-all whitespace-nowrap cursor-pointer"
              >
                <Search className="w-4 h-4" />
                View Statement
              </button>
            </div>
          </div>

          {/* Connected Partner Sub-bar (Placed cleanly below controls to keep horizontal row alignment pixel-perfect) */}
          {selectedName && (
            <div className="pt-2 border-t border-black/[0.04] flex items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#20596E]/5 border border-[#20596E]/15 rounded-xl text-[#20596E] font-medium">
                {filterType === 'doctor' ? (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-[#20596E]" />
                    <span>
                      Connected Clinic:{' '}
                      <b className="text-[#1d1d1f]">
                        {connectedClinicName || '— (Independent Doctor)'}
                      </b>
                    </span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5 text-[#20596E]" />
                    <span>
                      Connected Doctor:{' '}
                      <b className="text-[#1d1d1f]">
                        {connectedDoctorName || '— (Facility Account)'}
                      </b>
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Statement Results Canvas */}
      {hasSearched && (
        <div className="print-report-container bg-white rounded-3xl border border-black/[0.06] p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all">
          {/* Fit Well Dental Lab Official Header Banner */}
          <div id="report-header-section" className="flex flex-col sm:flex-row items-center sm:items-start justify-between border-b-2 border-[#1d1d1f] pb-6 mb-8 gap-4">
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
                Monthly Statement
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                Accounts & Billing Breakdown
              </p>
            </div>
          </div>

          {/* Statement Meta (Shows both Doctor and Clinic if connected) */}
          <div id="report-meta-section" className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 pb-6 border-b border-[#e5e5ea] text-sm">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
                Doctor Name
              </span>
              <span className="text-base font-bold text-[#1d1d1f] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#20596E] flex-shrink-0" />
                <span className="truncate">
                  {filterType === 'doctor'
                    ? selectedName
                    : connectedDoctorName || <span className="text-[#86868b] font-normal italic">— (Facility Account)</span>}
                </span>
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
                Clinic Name
              </span>
              <span className="text-base font-bold text-[#1d1d1f] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#20596E] flex-shrink-0" />
                <span className="truncate">
                  {filterType === 'clinic'
                    ? selectedName
                    : connectedClinicName || <span className="text-[#86868b] font-normal italic">— (Independent Doctor)</span>}
                </span>
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
                Billing Period
              </span>
              <span className="text-base font-bold text-[#1d1d1f]">
                {monthLabel} {selectedYear}
              </span>
            </div>

            <div className="sm:text-right">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
                Statement Date
              </span>
              <span className="text-sm font-semibold text-[#6e6e73]">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Table */}
          {reportData.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-[#d2d2d7] rounded-2xl">
              <ReceiptIcon className="w-10 h-10 text-[#d2d2d7] mx-auto mb-2" />
              <p className="text-[14px] font-semibold text-[#1d1d1f]">
                No receipts found for {selectedName}
                {filterType === 'doctor' && connectedClinicName ? ` (${connectedClinicName})` : ''}
                {filterType === 'clinic' && connectedDoctorName ? ` (${connectedDoctorName})` : ''} in {monthLabel} {selectedYear}.
              </p>
              <p className="text-xs text-[#86868b] mt-1">
                Ensure receipts were registered with dates falling into this billing cycle.
              </p>
            </div>
          ) : (
            <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden bg-white shadow-sm">
              <table id="report-statement-table" className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#fbfbfd] border-b border-[#e5e5ea] text-[11px] font-bold uppercase text-[#86868b] tracking-wider">
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-[#e5e5ea] w-24 sm:w-28 text-center align-middle">
                      Date
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-[#e5e5ea] w-20 sm:w-24 text-center align-middle">
                      Bill No.
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-[#e5e5ea] text-left align-middle">
                      Works Items
                    </th>
                    <th colSpan={2} className="py-1.5 px-3 border-r border-[#e5e5ea] text-center">
                      Unit X Rs.
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-right w-32 sm:w-40 min-w-[130px] align-middle">
                      Amount
                    </th>
                  </tr>
                  <tr className="bg-[#fbfbfd] border-b border-[#e5e5ea] text-[10px] font-bold uppercase text-[#86868b] tracking-wider">
                    <th className="py-1 px-2 border-r border-[#e5e5ea] w-14 sm:w-16 text-center">
                      Unit
                    </th>
                    <th className="py-1 px-2 border-r border-[#e5e5ea] w-20 sm:w-24 text-right">
                      Rs.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f7]">
                  {reportData.flatMap((rec) => {
                    const items = Array.isArray(rec.workItems) && rec.workItems.length > 0
                      ? rec.workItems
                      : [{ work_item: 'Dental Work', unit: 1, rate: rec.total_amount ?? rec.totalAmount ?? 0, amount: rec.total_amount ?? rec.totalAmount ?? 0 }];

                    return items.map((item, itemIdx) => {
                      const jobNo = (rec.job_number || rec.jobNumber || '').trim();
                      const workName = (item.work_item || item.workItem || 'Dental Work').trim();
                      const mainTitle = jobNo ? `${jobNo} - ${workName}` : workName;

                      const secondaryDetails = [];
                      const teethNotation = (item.teeth_number || item.teethNumber || '').trim();
                      if (teethNotation) {
                        secondaryDetails.push(`Teeth: ${teethNotation}`);
                      }

                      const unitVal = item.unit !== undefined && item.unit !== null ? item.unit : 1;
                      const rateVal = Number(item.rate || 0);
                      const amountVal = Number(item.amount !== undefined && item.amount !== null ? item.amount : (unitVal * rateVal));

                      return (
                        <tr key={`${rec.id}-${itemIdx}`} className="hover:bg-[#fbfbfd] transition-colors">
                          <td className="py-2.5 px-3 border-r border-[#e5e5ea] font-mono text-xs text-[#1d1d1f] text-center whitespace-nowrap">
                            {formatDisplayDate(rec.date)}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e5e5ea] font-mono font-bold text-xs text-[#1d1d1f] text-center">
                            {rec.bill_number}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e5e5ea] text-xs text-[#1d1d1f]">
                            <div className="font-semibold text-[#1d1d1f]">{mainTitle}</div>
                            {secondaryDetails.length > 0 && (
                              <div className="text-[11px] text-[#86868b] font-normal leading-tight mt-0.5">
                                {secondaryDetails.join(' • ')}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 border-r border-[#e5e5ea] font-mono text-xs text-center font-semibold text-[#1d1d1f]">
                            {unitVal}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e5e5ea] font-mono text-xs text-right text-[#6e6e73]">
                            {rateVal.toLocaleString('en-IN', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-xs text-[#1d1d1f] whitespace-nowrap">
                            {amountVal.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
                <tfoot>
                  {appliedPreviousBalances.length > 0 ? (
                    <>
                      <tr className="bg-[#fbfbfd] border-t border-[#e5e5ea] text-xs font-semibold text-[#6e6e73]">
                        <td colSpan={3} className="py-2 px-4 border-r border-[#e5e5ea] text-right">
                          Current Month Subtotal:
                        </td>
                        <td className="py-2 px-2 border-r border-[#e5e5ea] text-center font-mono text-xs font-bold text-[#1d1d1f]">
                          {totalUnits}
                        </td>
                        <td className="py-2 px-2 border-r border-[#e5e5ea]"></td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#1d1d1f] whitespace-nowrap">
                          {totalAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                      {appliedPreviousBalances.map((item) => (
                        <tr key={item.id} className="bg-amber-50/40 border-t border-[#e5e5ea] text-xs font-semibold text-amber-800">
                          <td colSpan={5} className="py-2 px-4 border-r border-[#e5e5ea] text-right">
                            Previous Balance ({item.monthLabel} {item.year}):
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                            + {Number(item.amount).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#fbfbfd] border-t-2 border-[#1d1d1f] font-bold text-[#1d1d1f]">
                        <td colSpan={5} className="py-3 px-4 border-r border-[#e5e5ea] text-right uppercase text-xs">
                          Grand Total Due:
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-base text-[#20596E] whitespace-nowrap">
                          Rs. {grandTotalAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr className="bg-[#fbfbfd] border-t-2 border-[#1d1d1f] font-bold text-[#1d1d1f]">
                      <td colSpan={3} className="py-3 px-4 border-r border-[#e5e5ea] text-right uppercase text-xs">
                        Total:
                      </td>
                      <td className="py-3 px-2 border-r border-[#e5e5ea] text-center font-mono text-xs font-bold text-[#1d1d1f]">
                        {totalUnits}
                      </td>
                      <td className="py-3 px-2 border-r border-[#e5e5ea]"></td>
                      <td className="py-3 px-3 text-right font-mono text-base text-[#20596E] whitespace-nowrap">
                        Rs. {totalAmount.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          )}

          {/* Dynamic Print Spacer to push footer to bottom of last page */}
          <div id="report-print-spacer" className="print-spacer" style={{ height: '0px' }}></div>

          {/* Fit Well Statement Sign-off */}
          <div id="report-print-footer" className="print-report-footer mt-8 pt-6 border-t border-[#e5e5ea] flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
            <div className="text-xs text-[#86868b] text-center sm:text-left">
              <p className="font-semibold text-[#1d1d1f]">FIT WELL Dental Lab</p>
              <p className="mt-0.5">Anna Nagar, Madurai - 625 020. | Mob: 9894626727, 9043559065</p>
              <p className="mt-0.5 text-[11px] text-[#86868b]">Official Accounts & Billing Statement</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="w-48 border-b border-[#1d1d1f] pb-1 mb-1"></div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1d1d1f]">
                For FIT WELL DENTAL LAB
              </p>
              <p className="text-[10px] text-[#86868b]">Authorized Signature</p>
            </div>
          </div>

          {/* Previous Month Balance Add-on Panel (Bottom of Invoice Bill) */}
          <div className="no-print mt-8 pt-6 border-t border-[#e5e5ea] space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#20596E]/10 text-[#20596E] flex items-center justify-center flex-shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                    <span>Add Previous Month's Balance</span>
                    <span className="text-[11px] font-normal text-[#86868b]">
                      (Optional)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#86868b]">
                    Select previous months and enter pending amounts to include in this statement
                  </p>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Month Selector */}
                <div className="w-36">
                  <CustomSelect
                    size="sm"
                    value={prevMonth}
                    onChange={(e) => setPrevMonth(e.target.value)}
                    options={monthOptions}
                    placeholder="Previous Month"
                    icon={Calendar}
                    searchPlaceholder="Search month..."
                  />
                </div>

                {/* Year Input */}
                <input
                  type="number"
                  min="2020"
                  max="2040"
                  value={prevYear}
                  onChange={(e) => setPrevYear(e.target.value)}
                  className="w-20 h-8 px-2.5 text-[12px] font-medium bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
                />

                {/* Amount to add Input */}
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#86868b]">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={prevBalanceAmount}
                    onChange={(e) => setPrevBalanceAmount(e.target.value)}
                    placeholder="Pending Amount"
                    className="w-full h-8 pl-8 pr-2.5 text-[12px] font-mono font-bold bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
                  />
                </div>

                {/* Add to Bill Action Button */}
                <button
                  type="button"
                  onClick={handleAddPreviousBalance}
                  disabled={!selectedName || Number(prevBalanceAmount) <= 0}
                  className="h-8 flex items-center gap-1.5 px-3.5 text-[12px] font-semibold text-white bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] disabled:opacity-40 rounded-xl shadow-sm shadow-[#20596E]/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Bill
                </button>
              </div>
            </div>

            {/* List of Added Previous Month Balances */}
            {appliedPreviousBalances.length > 0 && (
              <div className="pt-3 border-t border-[#f5f5f7] flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mr-1">
                  Added Balances:
                </span>
                {appliedPreviousBalances.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[#34c759]/15 text-[#1e7e34] border border-[#34c759]/25"
                  >
                    <span>
                      {item.monthLabel} {item.year}: Rs. {Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBalanceItem(item.id)}
                      className="hover:bg-[#ff3b30]/20 hover:text-[#ff3b30] p-0.5 rounded-xl transition-colors ml-0.5"
                      title={`Remove ${item.monthLabel} ${item.year}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
