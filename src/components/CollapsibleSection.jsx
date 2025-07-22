import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function CollapsibleSection({ id, title, defaultCollapsed = false, children }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section className="bg-white rounded-lg shadow-md" aria-labelledby={id}>
      <header className="flex items-center justify-between p-3">
        <h3 id={id} className="text-base font-semibold text-gray-800">
          {title}
        </h3>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-600 hover:text-gray-800 focus:outline-none"
          aria-expanded={!collapsed}
          aria-controls={`${id}-content`}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      </header>
      <div id={`${id}-content`} className={`${collapsed ? 'hidden' : 'p-3 border-t'}`}>
        {children}
      </div>
    </section>
  );
}
