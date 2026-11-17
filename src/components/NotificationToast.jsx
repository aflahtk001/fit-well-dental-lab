import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function NotificationToast({
  notification,
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    if (!notification || duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [notification, duration, onClose]);

  if (!notification || !notification.text) return null;

  const type = notification.type || 'info';
  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isInfo = !isSuccess && !isError;

  const defaultTitle = isSuccess ? 'Action Successful' : isError ? 'Action Required' : 'Information';
  const title = notification.title || defaultTitle;

  return (
    <div
      className="fixed bottom-6 right-6 z-[110] no-print pointer-events-none transition-all duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)] p-4 max-w-sm sm:max-w-md w-full flex items-start gap-3.5 transform transition-all animate-in slide-in-from-bottom-3 fade-in duration-200">
        {/* Status Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
            isSuccess
              ? 'bg-emerald-50 text-[#34c759] border border-emerald-100'
              : isError
              ? 'bg-rose-50 text-[#ff3b30] border border-rose-100'
              : 'bg-[#20596E]/10 text-[#20596E] border border-[#20596E]/20'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-[#34c759]" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
          ) : (
            <Info className="w-5 h-5 text-[#20596E]" />
          )}
        </div>

        {/* Text Area */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="text-[13px] font-bold text-[#1d1d1f] tracking-tight leading-tight">
            {title}
          </div>
          <p className="text-[12.5px] text-[#6e6e73] mt-1 leading-snug break-words">
            {notification.text}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 rounded-full transition-colors flex-shrink-0"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
