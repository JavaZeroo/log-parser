import React, { useMemo } from 'react';
import { AlertTriangle, AlertOctagon, TrendingUp, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollapsibleCardHeader } from './CollapsibleCardHeader.jsx';
import { useCollapsedSection } from '../utils/useCollapsedSection.js';

const TYPE_META = {
  nan:       { icon: AlertOctagon, color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950' },
  explosion: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950' },
  spike:     { icon: TrendingUp,    color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' },
  plateau:   { icon: Minus,         color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800' }
};

function TypeBadge({ type, count, t }) {
  if (count === 0) return null;
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${meta.color} ${meta.bg}`}>
      <Icon size={11} aria-hidden="true" />
      <span className="font-mono tabular">{count}</span>
      <span className="hidden sm:inline">{t(`anomalies.type.${type}`)}</span>
    </span>
  );
}

function fileSummary(eventsByMetric) {
  const summary = { nan: 0, explosion: 0, spike: 0, plateau: 0, total: 0 };
  Object.values(eventsByMetric).forEach(events => {
    events.forEach(e => {
      if (summary[e.type] !== undefined) summary[e.type]++;
      summary.total++;
    });
  });
  return summary;
}

export function AnomaliesPanel({ anomaliesByFile = {}, files = [], collapseId }) {
  const { t } = useTranslation();
  const [open, setOpen] = useCollapsedSection(collapseId, false);
  const collapsible = Boolean(collapseId);

  // Stable list of file entries that actually have anomalies, in upload order.
  const entries = useMemo(() => {
    const result = [];
    files.forEach(file => {
      const eventsByMetric = anomaliesByFile[file.id];
      if (!eventsByMetric) return;
      const summary = fileSummary(eventsByMetric);
      if (summary.total === 0) return;
      result.push({ file, eventsByMetric, summary });
    });
    return result;
  }, [anomaliesByFile, files]);

  const totalCount = useMemo(
    () => entries.reduce((s, e) => s + e.summary.total, 0),
    [entries]
  );

  const titleNode = (
    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate">
      <span>{t('anomalies.title')}</span>
      {totalCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-semibold font-mono tabular bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
          {totalCount}
        </span>
      )}
    </h3>
  );

  return (
    <section className="card" aria-labelledby="anomalies-heading">
      <CollapsibleCardHeader
        titleNode={titleNode}
        titleId="anomalies-heading"
        icon={<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />}
        collapsible={collapsible}
        open={open}
        onToggle={() => setOpen(o => !o)}
      />
      {(!collapsible || open) && (
        <div className="mt-2">
          {entries.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('anomalies.empty')}
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {entries.map(({ file, eventsByMetric, summary }) => (
                <li
                  key={file.id}
                  className="text-xs bg-gray-50 dark:bg-gray-700 rounded p-2 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-gray-700 dark:text-gray-200" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <TypeBadge type="nan" count={summary.nan} t={t} />
                    <TypeBadge type="explosion" count={summary.explosion} t={t} />
                    <TypeBadge type="spike" count={summary.spike} t={t} />
                    <TypeBadge type="plateau" count={summary.plateau} t={t} />
                  </div>
                  {/* Per-metric breakdown: show metric name + count when >1 metric has anomalies */}
                  {Object.keys(eventsByMetric).length > 1 && (
                    <ul className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                      {Object.entries(eventsByMetric).map(([metric, events]) => (
                        <li key={metric} className="flex items-center justify-between">
                          <span className="font-mono truncate">{metric}</span>
                          <span className="font-mono tabular">{events.length}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
            {t('anomalies.hint')}
          </p>
        </div>
      )}
    </section>
  );
}
