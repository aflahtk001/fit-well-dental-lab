import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

// Quadrants definition matching the dental photo:
// Upper Right (UR): 8 to 1
// Upper Left (UL): 1 to 8
// Lower Right (LR): 8 to 1
// Lower Left (LL): 1 to 8
const LEFT_COLUMNS = [8, 7, 6, 5, 4, 3, 2, 1];
const RIGHT_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ToothChartModal({
  isOpen,
  initialValue = '',
  initialUnit = 0,
  onApply,
  onClose,
}) {
  const [selectedTeeth, setSelectedTeeth] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      parseInitialValue(initialValue);
    }
  }, [isOpen, initialValue]);

  function parseInitialValue(text) {
    const set = new Set();
    if (!text || typeof text !== 'string') {
      setSelectedTeeth(set);
      return;
    }

    const cleaned = text.trim();

    // 1. Check for quadrant sections separated by '|' or ';' (e.g. "UR: 1, 2 | UL: 3, 4" or "UR: 1-8")
    const segments = cleaned.split(/[|;]/);
    for (const seg of segments) {
      const matchQuad = seg.match(/\b(UR|UL|LR|LL)\b/i);
      if (matchQuad) {
        const quad = matchQuad[1].toUpperCase();
        const rest = seg.slice(seg.indexOf(matchQuad[0]) + matchQuad[0].length).replace(/^[:\s-]+/, '');
        
        // Range like 1-8 or 1 to 8
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

        // Individual numbers 1-8
        const numMatches = rest.match(/\b([1-8])\b/g);
        if (numMatches) {
          for (const nm of numMatches) {
            set.add(`${quad}-${nm}`);
          }
        }
      }
    }

    // 2. Also match direct pairs like "UR-1", "UR1", "LL-6", "UL3" anywhere in the string
    const directMatches = cleaned.match(/\b(UR|UL|LR|LL)[-\s]?([1-8])\b/gi);
    if (directMatches) {
      for (const dm of directMatches) {
        const m = dm.match(/\b(UR|UL|LR|LL)[-\s]?([1-8])\b/i);
        if (m) {
          set.add(`${m[1].toUpperCase()}-${m[2]}`);
        }
      }
    }

    // 3. Match FDI two-digit notation if present (e.g. 11-18, 21-28, 31-38, 41-48)
    const fdiMatches = cleaned.match(/\b([1-4])([1-8])\b/g);
    if (fdiMatches) {
      const qMap = { '1': 'UR', '2': 'UL', '3': 'LL', '4': 'LR' };
      for (const fm of fdiMatches) {
        const q = qMap[fm[0]];
        if (q) set.add(`${q}-${fm[1]}`);
      }
    }

    setSelectedTeeth(set);
  }

  function toggleTooth(quad, num) {
    const key = `${quad}-${num}`;
    const next = new Set(selectedTeeth);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedTeeth(next);
  }

  function handleClear() {
    setSelectedTeeth(new Set());
  }

  function formatSelection() {
    const result = [];
    ['UR', 'UL', 'LR', 'LL'].forEach((quad) => {
      const teethInQuad = [];
      const arch = ['UR', 'LR'].includes(quad) ? LEFT_COLUMNS : RIGHT_COLUMNS;
      arch.forEach((num) => {
        if (selectedTeeth.has(`${quad}-${num}`)) {
          teethInQuad.push(num);
        }
      });
      if (teethInQuad.length > 0) {
        teethInQuad.sort((a, b) => a - b);
        result.push(`${quad}: ${teethInQuad.join(', ')}`);
      }
    });
    return result.join(' | ');
  }

  function handleSave() {
    const formatted = formatSelection();
    const count = selectedTeeth.size;
    onApply({
      teethNumber: formatted,
      unitCount: count,
    });
    onClose();
  }

  if (!isOpen) return null;

  const formattedSummary = formatSelection();
  const count = selectedTeeth.size;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Sized comfortably with max-w-4xl so all 16 teeth numbers have ample breathing room */}
      <div className="bg-white rounded-3xl shadow-2xl border border-black/10 max-w-4xl w-full overflow-hidden flex flex-col my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#fbfbfd] border-b border-[#e5e5ea] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#1d1d1f]">
              Dental Tooth Chart (Palmer Notation)
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              Click to select and circle teeth for this work item
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Top Arch Indicators */}
          <div className="flex justify-between items-center text-xs font-semibold text-[#86868b] uppercase tracking-wider px-3">
            <span>Patient Right (Maxillary / Mandibular)</span>
            <span>Patient Left</span>
          </div>

          {/* Dental Chart Container with Generous Padding */}
          <div className="bg-[#fbfbfd] border border-[#e5e5ea] rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Quadrant Labels */}
            <div className="flex justify-between items-center text-[11px] font-bold text-[#86868b] mb-4 px-2">
              <span>UR (Max Right)</span>
              <span>UL (Max Left)</span>
            </div>

            {/* The Integrated Grid: Columns guarantee 100% vertical alignment */}
            <div className="relative flex items-center justify-center w-full max-w-3xl mx-auto py-2">
              {/* Continuous Horizontal Baseline across all teeth */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#1d1d1f] z-0"></div>

              {/* Left Side: 8, 7, 6, 5, 4, 3, 2, 1 */}
              <div className="flex-1 flex justify-between items-center z-10 pr-2">
                {LEFT_COLUMNS.map((num) => {
                  const isTopSelected = selectedTeeth.has(`UR-${num}`);
                  const isBotSelected = selectedTeeth.has(`LR-${num}`);
                  return (
                    <div
                      key={`col-left-${num}`}
                      className="flex flex-col items-center flex-1 min-w-[32px] max-w-[44px]"
                    >
                      {/* Top Number (UR) */}
                      <button
                        type="button"
                        onClick={() => toggleTooth('UR', num)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isTopSelected
                            ? 'border-2 border-[#20596E] bg-[#20596E]/10 text-[#20596E] shadow-sm scale-110'
                            : 'text-[#1d1d1f] hover:bg-black/5 hover:scale-105'
                        }`}
                      >
                        {num}
                      </button>

                      {/* Top Tick intersecting horizontal line */}
                      <div className="h-3 w-[2px] bg-[#1d1d1f]"></div>

                      {/* Bottom Tick intersecting horizontal line */}
                      <div className="h-3 w-[2px] bg-[#1d1d1f]"></div>

                      {/* Bottom Number (LR) */}
                      <button
                        type="button"
                        onClick={() => toggleTooth('LR', num)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isBotSelected
                            ? 'border-2 border-[#20596E] bg-[#20596E]/10 text-[#20596E] shadow-sm scale-110'
                            : 'text-[#1d1d1f] hover:bg-black/5 hover:scale-105'
                        }`}
                      >
                        {num}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Central Midline Vertical Divider (Tall line from dental sketch) */}
              <div className="z-20 px-2 flex justify-center items-center">
                <div className="w-[2.5px] h-20 bg-[#1d1d1f] rounded-full"></div>
              </div>

              {/* Right Side: 1, 2, 3, 4, 5, 6, 7, 8 */}
              <div className="flex-1 flex justify-between items-center z-10 pl-2">
                {RIGHT_COLUMNS.map((num) => {
                  const isTopSelected = selectedTeeth.has(`UL-${num}`);
                  const isBotSelected = selectedTeeth.has(`LL-${num}`);
                  return (
                    <div
                      key={`col-right-${num}`}
                      className="flex flex-col items-center flex-1 min-w-[32px] max-w-[44px]"
                    >
                      {/* Top Number (UL) */}
                      <button
                        type="button"
                        onClick={() => toggleTooth('UL', num)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isTopSelected
                            ? 'border-2 border-[#20596E] bg-[#20596E]/10 text-[#20596E] shadow-sm scale-110'
                            : 'text-[#1d1d1f] hover:bg-black/5 hover:scale-105'
                        }`}
                      >
                        {num}
                      </button>

                      {/* Top Tick intersecting horizontal line */}
                      <div className="h-3 w-[2px] bg-[#1d1d1f]"></div>

                      {/* Bottom Tick intersecting horizontal line */}
                      <div className="h-3 w-[2px] bg-[#1d1d1f]"></div>

                      {/* Bottom Number (LL) */}
                      <button
                        type="button"
                        onClick={() => toggleTooth('LL', num)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isBotSelected
                            ? 'border-2 border-[#20596E] bg-[#20596E]/10 text-[#20596E] shadow-sm scale-110'
                            : 'text-[#1d1d1f] hover:bg-black/5 hover:scale-105'
                        }`}
                      >
                        {num}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Quadrant Labels */}
            <div className="flex justify-between items-center text-[11px] font-bold text-[#86868b] mt-4 px-2">
              <span>LR (Mand Right)</span>
              <span>LL (Mand Left)</span>
            </div>
          </div>

          {/* Selection Status & Auto-Set Unit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-[#e5e5ea] rounded-2xl shadow-sm">
            <div>
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider block">
                Selected Teeth Notation
              </span>
              <span className="text-base font-bold text-[#1d1d1f] mt-1 block font-mono">
                {formattedSummary || 'None selected (Click numbers on chart above)'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#fbfbfd] px-4 py-2 rounded-xl border border-[#e5e5ea]">
              <span className="text-xs font-semibold text-[#1d1d1f]">
                Unit Quantity: <b className="text-[#20596E] font-mono text-sm ml-1">{count}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#fbfbfd] border-t border-[#e5e5ea] flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#86868b] hover:text-[#ff3b30] rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Selection
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-6 py-2 text-[13px] font-medium text-white bg-[#20596E] hover:bg-[#286e88] active:bg-[#184656] rounded-xl shadow-sm shadow-[#20596E]/20 transition-all"
            >
              <Check className="w-4 h-4" />
              Apply Teeth
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
