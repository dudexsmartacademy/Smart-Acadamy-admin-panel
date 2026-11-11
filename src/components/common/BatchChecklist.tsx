import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { academicService } from '../../services/academicService';

/** Every global batch ("Batch 1", "Batch 2", ...) with the college it belongs to. */
export function useGlobalBatches(): Array<{ name: string; college: string }> {
  const [colleges, setColleges] = useState(academicService.getColleges());
  useEffect(() => {
    void academicService.fetchColleges().then((list) => setColleges([...list]));
    return academicService.onAcademicChange(() => setColleges([...academicService.getColleges()]));
  }, []);
  return useMemo(() => {
    const list = colleges.flatMap((c) => c.batches.map((b) => ({ name: b.name, college: c.collegeName })));
    const num = (n: string) => Number(/(\d+)/.exec(n)?.[1] || 0);
    return list.sort((a, b) => num(a.name) - num(b.name) || a.name.localeCompare(b.name));
  }, [colleges]);
}

interface BatchChecklistProps {
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  className?: string;
}

/** Dropdown with a checkbox per batch plus "All Batches". */
export const BatchChecklist: React.FC<BatchChecklistProps> = ({ values, onChange, disabled, className = '' }) => {
  const batches = useGlobalBatches();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const all = batches.length > 0 && batches.every((b) => values.includes(b.name));
  const toggle = (name: string) => onChange(values.includes(name) ? values.filter((v) => v !== name) : [...values, name]);
  const summary =
    values.length === 0
      ? 'Select batches'
      : all
        ? `All Batches (${batches.length})`
        : values.length <= 3
          ? values.join(', ')
          : `${values.length} batches selected`;

  const box = (checked: boolean) => (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        checked ? 'border-[#8b4f2b] bg-[#8b4f2b] text-white' : 'border-[#cbbdaf] bg-white'
      }`}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
  );

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-10 w-full items-center justify-between rounded-lg border border-[#d8cec2] bg-[#fffdfa] px-3 text-left text-sm text-[#28221e] outline-none focus:border-[#9a6744] disabled:opacity-60 ${className}`}
      >
        <span className={`truncate ${values.length === 0 ? 'text-[#a69a90]' : ''}`}>{summary}</span>
        <ChevronDown size={15} className={`ml-2 shrink-0 text-[#756a62] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#d8cec2] bg-[#fffdfa] p-1.5 shadow-xl"
        >
          {batches.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#756a62]">No batches yet. Create a college with batches first.</p>
          ) : (
            <>
              <button
                type="button"
                role="option"
                aria-selected={all}
                onClick={() => onChange(all ? [] : batches.map((b) => b.name))}
                className="flex w-full items-center gap-2.5 rounded-md border-b border-[#efe6db] px-3 py-2 text-left text-sm font-semibold text-[#211d1a] hover:bg-[#f3ece3]"
              >
                {box(all)}
                All Batches
              </button>
              {batches.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  role="option"
                  aria-selected={values.includes(b.name)}
                  onClick={() => toggle(b.name)}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-[#28221e] hover:bg-[#f3ece3]"
                >
                  {box(values.includes(b.name))}
                  <span>{b.name}</span>
                  <span className="ml-auto truncate text-xs text-[#8a7e74]">{b.college}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchChecklist;
