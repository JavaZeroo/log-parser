import React, { useState, useEffect, useRef } from 'react';
import { X, Settings as SettingsIcon, Gauge, Target, FlaskConical, AlertTriangle, MapPin, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Card-style toggle row used in the Experimental tab — icon + title/description
// on the left, switch-styled checkbox on the right. Self-contained so the
// modal body stays readable.
function FeatureToggle({ icon, title, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
        {description && (
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        className="mt-1 checkbox shrink-0"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

// Long-lived settings that users typically configure once per log format / project
// and then don't touch. Sidebar reserves itself for high-frequency analysis work;
// these go behind a gear button + Ctrl+, shortcut.
export function SettingsModal({
  isOpen,
  onClose,
  // Chart performance
  chartConfig,
  onChartConfigChange,
  // Baseline thresholds
  relativeBaseline,
  onRelativeBaselineChange,
  absoluteBaseline,
  onAbsoluteBaselineChange,
  // Destructive — clears everything
  onResetAll
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('performance');
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen && closeBtnRef.current) closeBtnRef.current.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'performance', label: t('settings.tabPerformance'), icon: Gauge },
    { id: 'baseline', label: t('settings.tabBaseline'), icon: Target },
    { id: 'experimental', label: t('settings.tabExperimental'), icon: FlaskConical }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 drag-overlay-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[640px] max-h-[85vh] flex flex-col drag-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 id="settings-modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('settings.title')}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t('settings.close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body: vertical tabs on the left for desktop, top-tabs on mobile */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Tab strip */}
          <nav
            className="sm:w-44 sm:flex-shrink-0 sm:border-r sm:border-gray-200 sm:dark:border-gray-700 p-3 sm:py-4 border-b sm:border-b-0 border-gray-200 dark:border-gray-700"
            role="tablist"
            aria-label={t('settings.title')}
          >
            <ul className="flex sm:flex-col gap-1 sm:gap-0.5">
              {tabs.map((tabDef) => {
                const active = tab === tabDef.id;
                const TabIcon = tabDef.icon;
                return (
                  <li key={tabDef.id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(tabDef.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        active
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <TabIcon size={14} aria-hidden="true" />
                      <span>{tabDef.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-5 min-w-0">
            {tab === 'performance' && (
              <div role="tabpanel" className="tab-fade space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.performanceHint')}
                </p>
                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="mr-2 checkbox"
                    checked={chartConfig.downsampleEnabled}
                    onChange={(e) =>
                      onChartConfigChange(prev => ({ ...prev, downsampleEnabled: e.target.checked }))
                    }
                  />
                  {t('display.downsample')}
                </label>
                {chartConfig.downsampleEnabled && (
                  <div>
                    <label
                      htmlFor="settings-downsample-threshold"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('display.downsampleThreshold')}
                    </label>
                    <input
                      id="settings-downsample-threshold"
                      type="number"
                      min="100"
                      step="100"
                      value={chartConfig.downsampleThreshold}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isFinite(v) && v >= 100) {
                          onChartConfigChange(prev => ({ ...prev, downsampleThreshold: v }));
                        }
                      }}
                      className="input-field max-w-xs"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t('display.downsampleDesc')}
                </p>
              </div>
            )}

            {tab === 'experimental' && (
              <div role="tabpanel" className="tab-fade space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <FlaskConical size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    {t('settings.experimentalHint')}
                  </p>
                </div>

                <FeatureToggle
                  icon={<AlertTriangle size={16} className="text-red-600 dark:text-red-400" />}
                  title={t('anomalies.title')}
                  description={t('settings.experimentalAnomaliesDesc')}
                  checked={!!chartConfig.experimentalAnomalies}
                  onChange={(v) => onChartConfigChange(prev => ({ ...prev, experimentalAnomalies: v }))}
                />

                <FeatureToggle
                  icon={<MapPin size={16} className="text-blue-600 dark:text-blue-400" />}
                  title={t('annotations.title')}
                  description={t('settings.experimentalAnnotationsDesc')}
                  checked={!!chartConfig.experimentalAnnotations}
                  onChange={(v) => onChartConfigChange(prev => ({ ...prev, experimentalAnnotations: v }))}
                />

                {/* Danger zone — destructive operations live here so they don't
                    take up scarce header / sidebar real estate. */}
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
                    {t('settings.dangerZone')}
                  </h3>
                  <div className="flex items-start gap-3 p-3 rounded-md border border-red-200 dark:border-red-900/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('resetConfig')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {t('settings.resetDesc')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onResetAll) onResetAll();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-800 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 shrink-0"
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      {t('settings.resetButton')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'baseline' && (
              <div role="tabpanel" className="tab-fade space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.baselineHint')}
                </p>
                <div>
                  <label
                    htmlFor="settings-relative-baseline"
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('display.relativeBaseline')}
                  </label>
                  <input
                    id="settings-relative-baseline"
                    type="number"
                    step="0.001"
                    value={relativeBaseline}
                    onChange={(e) => onRelativeBaselineChange(parseFloat(e.target.value) || 0)}
                    className="input-field max-w-xs"
                    placeholder="0.002"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('display.relativeBaselineDesc')}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="settings-absolute-baseline"
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('display.absoluteBaseline')}
                  </label>
                  <input
                    id="settings-absolute-baseline"
                    type="number"
                    step="0.001"
                    value={absoluteBaseline}
                    onChange={(e) => onAbsoluteBaselineChange(parseFloat(e.target.value) || 0)}
                    className="input-field max-w-xs"
                    placeholder="0.005"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('display.absoluteBaselineDesc')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>{t('settings.footerHint')}</span>
          <kbd className="inline-flex items-center px-1.5 h-5 text-[11px] font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">Esc</kbd>
        </div>
      </div>
    </div>
  );
}
