import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Apple-styled Custom Select Component
 * Matches the macOS / Apple SF Pro design DNA of the Dental Lab suite.
 */
export default function CustomSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select an option',
  icon: LeadingIcon,
  clearable = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  size = 'md',
  className = '',
  menuClassName = '',
  disabled = false,
  ariaLabel,
  emptyMessage = 'No options found',
  creatable = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const hasValue = value !== '' && value !== null && value !== undefined;

  // Normalize options to objects: { value, label, count, icon, avatar, sublabel, disabled }
  const normalizedOptions = useMemo(() => {
    return options
      .map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            value: opt.value !== undefined ? opt.value : '',
            label: opt.label !== undefined ? String(opt.label) : String(opt.value || ''),
            count: opt.count,
            icon: opt.icon,
            avatar: opt.avatar,
            sublabel: opt.sublabel,
            disabled: Boolean(opt.disabled),
          };
        }
        return {
          value: String(opt),
          label: String(opt),
          disabled: false,
        };
      })
      .filter((opt) => {
        // Exclude dummy placeholder options like "-- None / Select Doctor --" or "Nothing is marked"
        if (opt.value === '' && (/^--\s*(none|select|choose)/i.test(opt.label) || /none\s*\/\s*select/i.test(opt.label))) {
          return false;
        }
        return true;
      });
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (!hasValue) return null;
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value, hasValue]);

  // Search is enabled by default on all dropdowns unless explicitly disabled with searchable={false}
  const isSearchable = searchable !== false;

  // Filter options by search query (checks label, value, avatar/initials, and sublabel)
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      return (
        opt.label.toLowerCase().includes(q) ||
        String(opt.value).toLowerCase().includes(q) ||
        (opt.avatar && String(opt.avatar).toLowerCase().includes(q)) ||
        (opt.sublabel && String(opt.sublabel).toLowerCase().includes(q))
      );
    });
  }, [normalizedOptions, searchQuery]);

  // Determine popup placement (open up vs down) when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 240px below and more room above, open upward
      if (spaceBelow < 240 && rect.top > 240) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
      // Focus search input on open
      if (isSearchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 30);
      }
    } else {
      setSearchQuery('');
      setActiveIndex(-1);
    }
  }, [isOpen, isSearchable]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option-item]');
      const activeEl = items[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  function notifyChange(newVal) {
    if (!onChange) return;
    const syntheticEvent = {
      target: { value: newVal },
      currentTarget: { value: newVal },
      value: newVal,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
    onChange(syntheticEvent, newVal);
  }

  function handleSelect(opt) {
    if (opt.disabled) return;
    if (clearable && hasValue && String(opt.value) === String(value)) {
      notifyChange('');
    } else {
      notifyChange(opt.value);
    }
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleClear(e) {
    e.stopPropagation();
    notifyChange('');
    triggerRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= filteredOptions.length ? 0 : next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? filteredOptions.length - 1 : next;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        handleSelect(filteredOptions[activeIndex]);
      } else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0]);
      }
    }
  }

  // Size styling variants
  const sizeStyles = {
    sm: {
      trigger: 'h-8 px-2.5 text-[12px]',
      icon: 'w-3.5 h-3.5',
      chevron: 'w-3.5 h-3.5',
      option: 'py-1.5 px-2.5 text-[12px]',
    },
    md: {
      trigger: 'h-10 px-3.5 text-[13px]',
      icon: 'w-4 h-4',
      chevron: 'w-4 h-4',
      option: 'py-2 px-3 text-[13px]',
    },
    lg: {
      trigger: 'h-11 px-3.5 text-[14px]',
      icon: 'w-4 h-4',
      chevron: 'w-4 h-4',
      option: 'py-2.5 px-3.5 text-[14px]',
    },
  }[size] || {
    trigger: 'h-10 px-3.5 text-[13px]',
    icon: 'w-4 h-4',
    chevron: 'w-4 h-4',
    option: 'py-2 px-3 text-[13px]',
  };

  const isAllOption = selectedOption && selectedOption.value === '';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full select-none text-left font-sans ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border font-medium text-left transition-all outline-none ${
          sizeStyles.trigger
        } ${
          disabled
            ? 'bg-[#f5f5f7] border-[#e5e5ea] text-[#aeaeb2] cursor-not-allowed shadow-none'
            : isOpen
            ? 'bg-white border-[#20596E] ring-2 ring-[#20596E]/20 shadow-[0_2px_8px_rgba(32,89,110,0.08)]'
            : 'bg-[#fbfbfd] border-[#d2d2d7] text-[#1d1d1f] hover:bg-white hover:border-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {LeadingIcon && (
            <LeadingIcon
              className={`flex-shrink-0 text-[#86868b] transition-colors ${sizeStyles.icon} ${
                isOpen ? 'text-[#20596E]' : ''
              }`}
            />
          )}

          {selectedOption ? (
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="truncate text-[#1d1d1f] font-medium">
                {selectedOption.label}
              </span>
              {selectedOption.count !== undefined && (
                <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded-md bg-black/[0.05] text-[#86868b]">
                  {selectedOption.count}
                </span>
              )}
            </div>
          ) : (
            <span className="truncate text-[#86868b] font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {clearable && hasValue && !isAllOption && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 rounded-md text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.06] transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`text-[#86868b] transition-transform duration-200 ${sizeStyles.chevron} ${
              isOpen ? 'rotate-180 text-[#20596E]' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Apple-Style Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute left-0 right-0 z-50 p-1.5 bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] ${
            openUpward
              ? 'bottom-full mb-1.5 apple-dropdown-menu-up'
              : 'top-full mt-1.5 apple-dropdown-menu'
          } ${menuClassName}`}
        >
          {/* Search bar inside menu if searchable */}
          {isSearchable && (
            <div className="px-1 pt-0.5 pb-1.5 border-b border-black/[0.05] mb-1">
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 bg-[#f5f5f7] border border-transparent rounded-xl focus-within:border-[#20596E]/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#20596E]/15 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <Search className="w-3.5 h-3.5 text-[#86868b] flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-[12px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      setActiveIndex(-1);
                      searchInputRef.current?.focus();
                    }}
                    className="p-0.5 text-[#86868b] hover:text-[#1d1d1f] rounded transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5 py-0.5"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,0,0,0.15) transparent',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#86868b] flex flex-col items-center justify-center gap-1">
                <span>{searchQuery ? `No results for "${searchQuery}"` : emptyMessage}</span>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = hasValue && String(opt.value) === String(value);
                const isKeyboardActive = idx === activeIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    data-option-item
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`group w-full flex items-center justify-between rounded-xl cursor-pointer select-none transition-all ${
                      sizeStyles.option
                    } ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#20596E]/10 text-[#20596E] font-semibold'
                        : isKeyboardActive
                        ? 'bg-black/[0.04] text-[#1d1d1f]'
                        : 'text-[#1d1d1f] hover:bg-black/[0.04]'
                    }`}
                  >
                    <div className="min-w-0 truncate flex-1">
                      <div className="truncate leading-tight">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-[#86868b] truncate font-normal">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {opt.count !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-md transition-colors ${
                            isSelected
                              ? 'bg-[#20596E]/15 text-[#20596E]'
                              : 'bg-black/[0.05] text-[#86868b]'
                          }`}
                        >
                          {opt.count}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#20596E] flex-shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Creatable option action if query has no exact match */}
          {creatable && searchQuery.trim() && !normalizedOptions.some((o) => o.value.toLowerCase().trim() === searchQuery.toLowerCase().trim()) && (
            <div className="pt-1.5 mt-1 border-t border-[#e5e5ea]">
              <button
                type="button"
                onClick={() => {
                  const customVal = searchQuery.trim();
                  handleSelect({ value: customVal, label: customVal });
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#20596E]/5 hover:bg-[#20596E]/10 text-[#20596E] border border-dashed border-[#20596E]/30 flex items-center justify-between transition-colors text-left cursor-pointer"
              >
                <span className="truncate">Add new: "{searchQuery.trim()}"</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#20596E] text-white flex-shrink-0 ml-1.5">
                  + Add
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
