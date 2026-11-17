import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Layers, 
  Users, 
  BarChart3, 
  Database,
} from 'lucide-react';
import ReceiptPage from './pages/ReceiptPage';
import SavedReceiptsPage from './pages/SavedReceiptsPage';
import DoctorsAndClinicsPage from './pages/DoctorsAndClinicsPage';
import MonthlyReportPage from './pages/MonthlyReportPage';

const VALID_PAGES = ['receipt', 'saved-receipts', 'doctors-clinics', 'doctors', 'clinics', 'reports'];

function getInitialPage() {
  if (typeof window === 'undefined') return 'receipt';
  // 1. Check URL hash (e.g. #/doctors or #doctors)
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (VALID_PAGES.includes(hash)) {
    if (hash === 'doctors' || hash === 'clinics') return 'doctors-clinics';
    return hash;
  }
  // 2. Check localStorage
  try {
    const saved = localStorage.getItem('fitwell_active_page');
    if (saved && VALID_PAGES.includes(saved)) {
      if (saved === 'doctors' || saved === 'clinics') return 'doctors-clinics';
      return saved;
    }
  } catch {}
  return 'receipt';
}

export default function App() {
  const [activePage, setActivePage] = useState(getInitialPage);
  const [directoryTab, setDirectoryTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash === 'clinics') return 'clinics';
    }
    return 'doctors';
  });

  const [editingReceipt, setEditingReceipt] = useState(() => {
    try {
      const stored = sessionStorage.getItem('fitwell_editing_receipt');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const mainRef = useRef(null);

  // Sync activePage with localStorage and URL hash
  useEffect(() => {
    try {
      localStorage.setItem('fitwell_active_page', activePage);
    } catch {}
    if (window.location.hash.replace(/^#\/?/, '') !== activePage) {
      window.location.hash = `#/${activePage}`;
    }
  }, [activePage]);

  // Support browser back/forward or hash changes
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (VALID_PAGES.includes(hash)) {
        if (hash === 'doctors') {
          setDirectoryTab('doctors');
          setActivePage('doctors-clinics');
        } else if (hash === 'clinics') {
          setDirectoryTab('clinics');
          setActivePage('doctors-clinics');
        } else if (hash !== activePage) {
          setActivePage(hash);
        }
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activePage]);

  // Save scroll position for the current page
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    function saveScroll() {
      try {
        sessionStorage.setItem(`fitwell_scroll_${activePage}`, String(mainEl.scrollTop));
      } catch {}
    }

    let timer;
    function handleScroll() {
      clearTimeout(timer);
      timer = setTimeout(saveScroll, 80);
    }

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', saveScroll);

    return () => {
      clearTimeout(timer);
      saveScroll();
      mainEl.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', saveScroll);
    };
  }, [activePage]);

  // Restore scroll position when page changes or after refresh
  useEffect(() => {
    try {
      const savedScroll = sessionStorage.getItem(`fitwell_scroll_${activePage}`);
      if (savedScroll !== null && mainRef.current) {
        const top = Number(savedScroll);
        requestAnimationFrame(() => {
          if (mainRef.current) {
            mainRef.current.scrollTop = top;
          }
        });
        const timeout = setTimeout(() => {
          if (mainRef.current && mainRef.current.scrollTop !== top) {
            mainRef.current.scrollTop = top;
          }
        }, 60);
        return () => clearTimeout(timeout);
      }
    } catch {}
  }, [activePage]);

  function handleNavigate(page, extra = {}) {
    if (page !== 'receipt') {
      setEditingReceipt(null);
      try {
        sessionStorage.removeItem('fitwell_editing_receipt');
      } catch {}
    }

    if (page === 'doctors' || page === 'clinics') {
      setDirectoryTab(page);
      setActivePage('doctors-clinics');
      return;
    }

    if (page === 'doctors-clinics') {
      if (extra?.tab) setDirectoryTab(extra.tab);
      setActivePage('doctors-clinics');
      return;
    }

    setActivePage(page);
  }

  function handleEditReceipt(rec) {
    setEditingReceipt(rec);
    try {
      sessionStorage.setItem('fitwell_editing_receipt', JSON.stringify(rec));
    } catch {}
    setActivePage('receipt');
  }

  function handleClearEditing() {
    setEditingReceipt(null);
    try {
      sessionStorage.removeItem('fitwell_editing_receipt');
    } catch {}
  }

  // Unified single page for Doctors & Clinics
  const navItems = [
    { id: 'receipt', label: 'Receipt Filling', icon: FileText },
    { id: 'saved-receipts', label: 'Saved Receipts', icon: Layers },
    { id: 'doctors-clinics', label: 'Doctors & Clinics', icon: Users },
    { id: 'reports', label: 'Monthly Report', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex font-sans text-[#1d1d1f]">
      {/* Apple-style Left Sidebar Navigation Bar (Hidden in Print) */}
      <aside className="no-print w-64 flex-shrink-0 min-h-screen bg-[#fbfbfd] border-r border-[#e5e5ea] flex flex-col justify-between p-5 sticky top-0 h-screen select-none">
        <div className="space-y-6">
          {/* App Brand Header */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-2xl bg-[#20596E] text-white flex items-center justify-center shadow-md shadow-[#20596E]/20 font-bold text-sm tracking-tight">
              FW
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight text-[#1d1d1f] leading-tight">
                FIT WELL
              </div>
              <div className="text-[11px] font-medium text-[#86868b] tracking-normal">
                Dental Lab • Madurai
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] px-3 mb-2">
              Workspace
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#20596E] text-white shadow-sm shadow-[#20596E]/25 font-semibold'
                        : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#86868b]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Status Capsule */}
        <div className="pt-4 border-t border-[#e5e5ea]">
          <div className="bg-white/80 border border-[#e5e5ea] rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                System Status
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34c759]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse"></span>
                Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#1d1d1f] mt-1.5">
              <Database className="w-3.5 h-3.5 text-[#20596E]" />
              <span>Offline SQLite Engine</span>
            </div>
            <p className="text-[10px] text-[#86868b] mt-0.5">Local Encrypted Storage</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1 min-w-0 px-[15px] py-6 sm:py-8 overflow-y-auto">
        <div className="w-full">
          {activePage === 'receipt' && (
            <ReceiptPage
              onNavigate={handleNavigate}
              editingReceipt={editingReceipt}
              onClearEditing={handleClearEditing}
            />
          )}
          {activePage === 'saved-receipts' && (
            <SavedReceiptsPage
              onNavigate={handleNavigate}
              onEditReceipt={handleEditReceipt}
            />
          )}
          {activePage === 'doctors-clinics' && (
            <DoctorsAndClinicsPage initialTab={directoryTab} />
          )}
          {activePage === 'reports' && <MonthlyReportPage />}
        </div>
      </main>
    </div>
  );
}
