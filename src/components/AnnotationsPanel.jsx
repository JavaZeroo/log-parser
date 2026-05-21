import React, { useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollapsibleCardHeader } from './CollapsibleCardHeader.jsx';
import { useCollapsedSection } from '../utils/useCollapsedSection.js';

export function AnnotationsPanel({ annotations = [], onAdd, onRemove, collapseId }) {
  const [xVal, setXVal] = useState('');
  const [label, setLabel] = useState('');
  const { t } = useTranslation();
  const [open, setOpen] = useCollapsedSection(collapseId, false);
  const collapsible = Boolean(collapseId);

  const handleAdd = () => {
    const x = parseFloat(xVal);
    if (!Number.isFinite(x)) return;
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x,
      label: label.trim()
    });
    setXVal('');
    setLabel('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <section className="card" aria-labelledby="annotations-heading">
      <CollapsibleCardHeader
        titleId="annotations-heading"
        title={annotations.length > 0 ? `${t('annotations.title')} (${annotations.length})` : t('annotations.title')}
        icon={<MapPin size={16} />}
        collapsible={collapsible}
        open={open}
        onToggle={() => setOpen(o => !o)}
      />
      {(!collapsible || open) && (
      <>
      <div className="flex gap-1 mb-2 mt-2">
        <input
          type="number"
          placeholder={t('annotations.xPlaceholder')}
          value={xVal}
          onChange={(e) => setXVal(e.target.value)}
          onKeyDown={handleKey}
          className="input-field w-20"
          aria-label={t('annotations.xPlaceholder')}
        />
        <input
          type="text"
          placeholder={t('annotations.labelPlaceholder')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKey}
          className="input-field flex-1"
          aria-label={t('annotations.labelPlaceholder')}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!Number.isFinite(parseFloat(xVal))}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title={t('annotations.add')}
          aria-label={t('annotations.add')}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
      {annotations.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('annotations.empty')}</p>
      ) : (
        <ul className="space-y-1 text-xs" role="list">
          {annotations.map(a => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
            >
              <span className="font-mono text-gray-700 dark:text-gray-200 truncate">
                <span className="text-gray-500 dark:text-gray-400">x=</span>{a.x}
                {a.label && <span className="ml-2 text-gray-600 dark:text-gray-300">· {a.label}</span>}
              </span>
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label={t('annotations.remove', { x: a.x })}
                title={t('annotations.remove', { x: a.x })}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      </>
      )}
    </section>
  );
}
