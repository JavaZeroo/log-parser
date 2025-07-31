import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function CollapsibleSection({ title, defaultOpen = true, action = null, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `section-${title}`.replace(/\s+/g, '-');
  return (
    <section className="bg-white rounded-lg shadow-md" aria-labelledby={id}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3"
        aria-expanded={open}
      >
        <h3 id={id} className="text-base font-semibold text-gray-800">
          {title}
        </h3>
        <span className="flex items-center gap-1">
          {action}
          <ChevronDown
            size={16}
            className={`text-gray-600 transition-transform ${open ? 'transform rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>
      {open && <div className="p-3 border-t">{children}</div>}
    </section>
  );
}

export default CollapsibleSection;
