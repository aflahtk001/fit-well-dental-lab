import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Delete Receipt',
  subtitle,
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Delete Receipt',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  warningNotice,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div
      className="fixed inset-0 z-[100] no-print bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-150"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-black/[0.08] max-w-md w-full overflow-hidden transition-all transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple-style Modal Header (Matching ToothChartModal & macOS sheets) */}
        <div className="px-6 py-4 border-b border-[#e5e5ea] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                isDanger
                  ? 'bg-rose-50 text-[#ff3b30] border border-rose-100'
                  : isWarning
                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                  : 'bg-[#20596E]/10 text-[#20596E] border border-[#20596E]/20'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-4 h-4" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1d1d1f] tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mt-0.5">
                {subtitle || (isDanger ? 'Permanent Action' : 'Confirmation Required')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 rounded-full transition-colors"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-3.5">
          <div className="text-[13.5px] text-[#424245] leading-relaxed">
            {message}
          </div>

          {isDanger && warningNotice !== false && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-800 text-[12px]">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{typeof warningNotice === 'string' ? warningNotice : 'This record will be permanently deleted from the local database.'}</span>
            </div>
          )}
        </div>

        {/* Modal Footer (Matching ToothChartModal & Apple UI) */}
        <div className="px-6 py-3.5 bg-[#fbfbfd] border-t border-[#e5e5ea] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] active:bg-[#e5e5ea] transition-all shadow-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDanger
                ? 'bg-[#ff3b30] hover:bg-[#e03126] active:bg-[#c9251b] shadow-[#ff3b30]/20'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                : 'bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] shadow-[#20596E]/20'
            }`}
          >
            {isDanger && <Trash2 className="w-3.5 h-3.5" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
