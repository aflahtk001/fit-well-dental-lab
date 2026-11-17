import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Building2,
  Trash2,
  Edit2,
  RotateCcw,
  ChevronRight,
  Users,
  Search,
  X,
  Stethoscope,
  Link2,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import NotificationToast from '../components/NotificationToast';

export default function DoctorsAndClinicsPage() {
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Unified Add Form State (both fields optional, at least one required)
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Table Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'linked' | 'only-doctor' | 'only-clinic'

  // Edit Modal State
  const [editTarget, setEditTarget] = useState(null);
  const [editDocName, setEditDocName] = useState('');
  const [editClinicName, setEditClinicName] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (window.api) {
        const [docRes, clinicRes] = await Promise.all([
          window.api.getDoctors ? window.api.getDoctors() : { success: true, data: [] },
          window.api.getClinics ? window.api.getClinics() : { success: true, data: [] },
        ]);

        if (docRes.success) setDoctors(docRes.data || []);
        if (clinicRes.success) setClinics(clinicRes.data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // Handle Unified Add Submission
  async function handleAddEntry(e) {
    e.preventDefault();
    const trimmedDoc = doctorName.trim();
    const trimmedClin = clinicName.trim();

    if (!trimmedDoc && !trimmedClin) {
      setMessage({
        type: 'error',
        text: 'Both fields are optional, but at least one (Doctor Name or Clinic Name) must be filled.',
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (window.api) {
        // Case 1: Both Doctor and Clinic provided -> Link them
        if (trimmedDoc && trimmedClin) {
          await window.api.addDoctor({ name: trimmedDoc, clinicName: trimmedClin });
          setMessage({
            type: 'success',
            text: `Linked "${trimmedDoc}" with "${trimmedClin}" successfully!`,
          });
        }
        // Case 2: Only Doctor provided
        else if (trimmedDoc && !trimmedClin) {
          await window.api.addDoctor({ name: trimmedDoc, clinicName: '' });
          setMessage({
            type: 'success',
            text: `Doctor "${trimmedDoc}" (Only Doctor) added successfully!`,
          });
        }
        // Case 3: Only Clinic provided
        else if (!trimmedDoc && trimmedClin) {
          await window.api.addClinic({ name: trimmedClin, doctorName: '' });
          setMessage({
            type: 'success',
            text: `Clinic "${trimmedClin}" (Only Clinic) added successfully!`,
          });
        }

        setDoctorName('');
        setClinicName('');
        await loadData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  // Build Unified Deduplicated Directory List
  const unifiedList = useMemo(() => {
    const list = [];
    const clinicNamesWithDoctors = new Set();

    // 1. All Doctors (both linked and independent)
    for (const d of doctors) {
      const cName = (d.clinic_name || '').trim();
      if (cName) {
        clinicNamesWithDoctors.add(cName.toLowerCase());
      }
      list.push({
        key: `doc-${d.id}`,
        id: d.id,
        entityType: 'doctor',
        doctorName: d.name,
        clinicName: cName,
        type: cName ? 'linked' : 'only-doctor',
        created_at: d.created_at,
      });
    }

    // 2. Standalone Clinics (clinics that don't have any doctor linked to them)
    for (const c of clinics) {
      const cName = (c.name || '').trim();
      if (!clinicNamesWithDoctors.has(cName.toLowerCase())) {
        list.push({
          key: `clinic-${c.id}`,
          id: c.id,
          entityType: 'clinic',
          doctorName: (c.doctor_name || '').trim(),
          clinicName: cName,
          type: (c.doctor_name || '').trim() ? 'linked' : 'only-clinic',
          created_at: c.created_at,
        });
      }
    }

    return list;
  }, [doctors, clinics]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let linked = 0;
    let onlyDoc = 0;
    let onlyClin = 0;
    for (const item of unifiedList) {
      if (item.type === 'linked') linked++;
      else if (item.type === 'only-doctor') onlyDoc++;
      else if (item.type === 'only-clinic') onlyClin++;
    }
    return { all: unifiedList.length, linked, onlyDoc, onlyClin };
  }, [unifiedList]);

  // Filter & Search
  const filteredList = useMemo(() => {
    let result = unifiedList;

    if (filterType === 'linked') {
      result = result.filter((i) => i.type === 'linked');
    } else if (filterType === 'only-doctor') {
      result = result.filter((i) => i.type === 'only-doctor');
    } else if (filterType === 'only-clinic') {
      result = result.filter((i) => i.type === 'only-clinic');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (i) =>
          (i.doctorName && i.doctorName.toLowerCase().includes(q)) ||
          (i.clinicName && i.clinicName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [unifiedList, filterType, searchTerm]);

  // Edit Handling
  function handleOpenEdit(item) {
    setEditTarget(item);
    setEditDocName(item.doctorName || '');
    setEditClinicName(item.clinicName || '');
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editTarget) return;

    const trimmedDoc = editDocName.trim();
    const trimmedClin = editClinicName.trim();

    if (!trimmedDoc && !trimmedClin) {
      setMessage({
        type: 'error',
        text: 'At least one field (Doctor Name or Clinic Name) must be filled.',
      });
      return;
    }

    setUpdating(true);
    try {
      if (window.api) {
        if (editTarget.entityType === 'doctor') {
          await window.api.updateDoctor({
            id: editTarget.id,
            name: trimmedDoc || editTarget.doctorName,
            clinicName: trimmedClin,
          });
        } else if (editTarget.entityType === 'clinic') {
          if (trimmedDoc) {
            // Also link doctor
            await window.api.addDoctor({ name: trimmedDoc, clinicName: trimmedClin || editTarget.clinicName });
          }
          await window.api.updateClinic({
            id: editTarget.id,
            name: trimmedClin || editTarget.clinicName,
            doctorName: trimmedDoc,
          });
        }

        setMessage({ type: 'success', text: 'Directory entry updated successfully!' });
        setEditTarget(null);
        await loadData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  }

  // Delete Handling
  async function confirmDelete() {
    if (!deleteTarget) return;
    const { entityType, id, displayName } = deleteTarget;
    setDeleteTarget(null);

    try {
      if (window.api) {
        if (entityType === 'doctor') {
          await window.api.deleteDoctor(id);
        } else {
          await window.api.deleteClinic(id);
        }
        setMessage({ type: 'success', text: `"${displayName}" removed successfully` });
        await loadData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  const isFormSubmittable = Boolean(doctorName.trim() || clinicName.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-1">
            <span>Database</span>
            <ChevronRight className="w-3 h-3 text-[#d2d2d7]" />
            <span>Directory</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            Doctors & Clinics
          </h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            Add a doctor, a clinic, or both together. Both fields are optional (only one required).
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] shadow-sm transition-all cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#86868b] ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Floating Action Notification Pop-up Card */}
      <NotificationToast notification={message} onClose={() => setMessage(null)} />

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Entry"
        subtitle="Directory Removal"
        message={
          deleteTarget ? (
            <span>
              Are you sure you want to remove{' '}
              <span className="font-semibold text-[#1d1d1f] px-1.5 py-0.5 bg-[#f5f5f7] border border-[#e5e5ea] rounded-md">
                {deleteTarget.displayName}
              </span>
              ? It will no longer appear in billing dropdowns.
            </span>
          ) : (
            ''
          )
        }
        confirmText="Remove Entry"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Unified Edit Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-[100] no-print bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-150"
          onClick={() => setEditTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-black/[0.08] max-w-lg w-full overflow-hidden p-6 transition-all animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#e5e5ea] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#20596E]/10 flex items-center justify-center text-[#20596E]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1d1d1f]">
                    Edit Directory Entry
                  </h3>
                  <p className="text-[11px] text-[#86868b]">
                    Update doctor name, clinic name, or their billing link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                  Doctor Name <span className="text-[10px] lowercase font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma (optional)"
                  className="w-full px-3.5 py-2.5 text-[14px] font-medium bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                  Clinic Name <span className="text-[10px] lowercase font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editClinicName}
                  onChange={(e) => setEditClinicName(e.target.value)}
                  placeholder="e.g. Apex Dental Care (optional)"
                  className="w-full px-3.5 py-2.5 text-[14px] font-medium bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all"
                />
              </div>

              <div className="text-[12px] text-[#86868b]">
                {editDocName.trim() && editClinicName.trim() ? (
                  <span className="text-emerald-700 font-medium">✓ Doctor and Clinic will be linked together.</span>
                ) : editDocName.trim() ? (
                  <span className="text-[#20596E] font-medium">✓ Will save as Only Doctor (Independent).</span>
                ) : editClinicName.trim() ? (
                  <span className="text-[#20596E] font-medium">✓ Will save as Only Clinic (Facility).</span>
                ) : (
                  <span className="text-red-500 font-medium">Please enter at least one field.</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e5e5ea]">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || (!editDocName.trim() && !editClinicName.trim())}
                  className="px-5 py-2 text-[13px] font-medium text-white bg-[#20596E] hover:bg-[#286e88] rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Add Card: Both fields optional, only one required */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_14px_rgba(0,0,0,0.03)] p-6 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#20596E]" />
            Add Doctor & Clinic
          </h2>
          <span className="text-[11px] font-semibold text-[#20596E] bg-[#20596E]/10 px-2.5 py-1 rounded-lg border border-[#20596E]/20">
            Unified Entry
          </span>
        </div>

        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: Doctor Name */}
            <div>
              <label htmlFor="unifiedDocInput" className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                Doctor Name <span className="text-[10px] lowercase font-normal">(optional)</span>
              </label>
              <input
                id="unifiedDocInput"
                type="text"
                list="existing-doctors-datalist"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma"
                className="w-full h-11 px-3.5 text-[14px] font-medium bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all shadow-sm"
              />
              <datalist id="existing-doctors-datalist">
                {doctors.map((d) => (
                  <option key={d.id} value={d.name} />
                ))}
              </datalist>
            </div>

            {/* Field 2: Clinic Name */}
            <div>
              <label htmlFor="unifiedClinicInput" className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                Clinic Name <span className="text-[10px] lowercase font-normal">(optional)</span>
              </label>
              <input
                id="unifiedClinicInput"
                type="text"
                list="existing-clinics-datalist"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Apex Dental Care"
                className="w-full h-11 px-3.5 text-[14px] font-medium bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20596E]/20 focus:border-[#20596E] focus:bg-white transition-all shadow-sm"
              />
              <datalist id="existing-clinics-datalist">
                {clinics.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="text-[12px] text-[#86868b] flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isFormSubmittable ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
              {doctorName.trim() && clinicName.trim() ? (
                <span className="text-emerald-700 font-semibold">
                  ✓ Doctor and Clinic will be linked together.
                </span>
              ) : doctorName.trim() ? (
                <span className="text-[#20596E] font-medium">
                  ✓ Will be added as an independent practitioner (<b>Only Doctor</b>).
                </span>
              ) : clinicName.trim() ? (
                <span className="text-[#20596E] font-medium">
                  ✓ Will be added as an institutional account (<b>Only Clinic</b>).
                </span>
              ) : (
                <span>Both fields are optional. Fill either Doctor, Clinic, or both.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !isFormSubmittable}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] text-white text-[13px] font-semibold rounded-xl shadow-sm shadow-[#20596E]/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Unified Directory Table Card */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_14px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Toolbar & Filter Pills */}
        <div className="px-6 py-4 border-b border-[#e5e5ea] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#fbfbfd]">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-[#1d1d1f]">
              Directory Records ({unifiedList.length})
            </h2>
            <span className="text-[11px] text-[#86868b] font-medium hidden sm:inline">
              • Unified System
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center bg-[#f0f0f2] p-0.5 rounded-xl text-[12px] font-medium w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('linked')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'linked'
                    ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                Linked ({counts.linked})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('only-doctor')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'only-doctor'
                    ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                Only Doctor ({counts.onlyDoc})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('only-clinic')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'only-clinic'
                    ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                Only Clinic ({counts.onlyClin})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search doctor or clinic..."
                className="w-full pl-8 pr-7 py-1.5 text-[12px] font-medium bg-white border border-[#d2d2d7] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#20596E] focus:border-[#20596E] transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Directory List / Table */}
        {loading ? (
          <div className="p-12 text-center text-sm text-[#86868b]">Loading directory...</div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-[#1d1d1f]">No entries match your search.</p>
            <p className="text-xs text-[#86868b] mt-1">Add a doctor or clinic above using the unified form.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f5f5f7]">
            {filteredList.map((item, idx) => {
              const hasDoc = Boolean(item.doctorName);
              const hasClinic = Boolean(item.clinicName);

              return (
                <div
                  key={item.key}
                  className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#fbfbfd] transition-colors"
                >
                  {/* Left: Doctor & Clinic details */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="w-6 text-xs text-[#86868b] font-mono select-none">
                      {idx + 1}.
                    </span>

                    <div className="w-9 h-9 rounded-xl bg-[#20596E]/10 flex items-center justify-center text-[#20596E] flex-shrink-0 font-semibold text-[13px]">
                      {hasDoc
                        ? item.doctorName.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() || 'D'
                        : item.clinicName.charAt(0).toUpperCase() || 'C'}
                    </div>

                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 items-center">
                      {/* Doctor Column */}
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] sm:hidden">
                          Doctor
                        </div>
                        {hasDoc ? (
                          <div className="text-[14px] font-semibold text-[#1d1d1f] truncate flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#20596E] flex-shrink-0" />
                            <span className="truncate">{item.doctorName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#86868b] italic">
                            — No Doctor (Only Clinic)
                          </span>
                        )}
                      </div>

                      {/* Clinic Column */}
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] sm:hidden">
                          Clinic
                        </div>
                        {hasClinic ? (
                          <div className="text-[13px] font-medium text-[#1d1d1f] truncate flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#20596E] flex-shrink-0" />
                            <span className="truncate">{item.clinicName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#86868b] italic">
                            — No Clinic (Only Doctor)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Badge & Actions */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-[#f5f5f7]">
                    {item.type === 'linked' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        <Link2 className="w-3 h-3" />
                        Linked
                      </span>
                    ) : item.type === 'only-doctor' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-[#f5f5f7] text-[#86868b] border border-[#e5e5ea] whitespace-nowrap">
                        <Stethoscope className="w-3 h-3" />
                        Only Doctor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-[#f5f5f7] text-[#86868b] border border-[#e5e5ea] whitespace-nowrap">
                        <Building2 className="w-3 h-3" />
                        Only Clinic
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 text-[#86868b] hover:text-[#20596E] hover:bg-[#20596E]/10 rounded-xl transition-colors cursor-pointer"
                        title="Edit Entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            entityType: item.entityType,
                            id: item.id,
                            displayName: item.doctorName || item.clinicName,
                          })
                        }
                        className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-xl transition-colors cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
