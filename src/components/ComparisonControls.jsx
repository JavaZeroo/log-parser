import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ComparisonControls({
  compareMode,
  onCompareModeChange,
  files = [],
  baseline,
  onBaselineChange,
  multiFileMode = 'baseline',
  onMultiFileModeChange
}) {
  const { t } = useTranslation();
  const modes = [
    { value: 'normal', label: t('comparison.normal'), description: t('comparison.normalDesc') },
    { value: 'absolute', label: t('comparison.absolute'), description: t('comparison.absoluteDesc') },
    { value: 'relative-normal', label: t('comparison.relativeNormal'), description: t('comparison.relativeNormalDesc') },
    { value: 'relative', label: t('comparison.relative'), description: t('comparison.relativeDesc') }
  ];

  return (
    <section className="card" aria-labelledby="comparison-controls-heading">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2
          size={16}
          className="text-gray-600 dark:text-gray-300"
          aria-hidden="true"
        />
        <h3
          id="comparison-controls-heading"
          className="card-title"
        >
          {t('comparison.title')}
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('comparison.multiFileMode')}
          </span>
          <div
            role="group"
            aria-label={t('comparison.multiFileMode')}
            className="inline-flex rounded-md border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onMultiFileModeChange?.('baseline')}
              aria-pressed={multiFileMode === 'baseline'}
              className={`px-2 py-1 text-xs font-medium focus:outline-none ${
                multiFileMode === 'baseline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {t('comparison.modeBaseline')}
            </button>
            <button
              type="button"
              onClick={() => onMultiFileModeChange?.('pairwise')}
              aria-pressed={multiFileMode === 'pairwise'}
              className={`px-2 py-1 text-xs font-medium border-l focus:outline-none ${
                multiFileMode === 'pairwise'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {t('comparison.modePairwise')}
            </button>
          </div>
        </div>

        {multiFileMode === 'baseline' && files.length > 1 && (
          <div>
            <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('comparison.baselineFile')}
            </span>
            <div className="space-y-1">
              {files.map(f => (
                <label
                  key={f.name}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <input
                    type="radio"
                    name="baseline-file"
                    value={f.name}
                    checked={(baseline || files[0]?.name) === f.name}
                    onChange={(e) => onBaselineChange?.(e.target.value)}
                    className="radio"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{f.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="sr-only">{t('comparison.select')}</legend>
          {modes.map(mode => (
            <label
              key={mode.value}
              className={`flex items-start gap-2 rounded border p-2 cursor-pointer text-xs ${
                compareMode === mode.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-gray-700'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <input
                type="radio"
                name="compareMode"
                value={mode.value}
                checked={compareMode === mode.value}
                onChange={(e) => onCompareModeChange(e.target.value)}
                className="radio mt-0.5"
                aria-describedby={`mode-${mode.value}-description`}
              />
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  {mode.label}
                </div>
                <div
                  id={`mode-${mode.value}-description`}
                  className="text-gray-500 dark:text-gray-400"
                >
                  {mode.description}
                </div>
              </div>
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  );
}

