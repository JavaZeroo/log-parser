import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

  export function ComparisonControls({
    compareMode,
    onCompareModeChange
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

        <fieldset className="space-y-2">
          <legend className="sr-only">{t('comparison.select')}</legend>
          {modes.map(mode => (
            <label
            key={mode.value}
            className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
          >
            <input
              type="radio"
              name="compareMode"
              value={mode.value}
              checked={compareMode === mode.value}
              onChange={(e) => onCompareModeChange(e.target.value)}
              className="radio"
              aria-describedby={`mode-${mode.value}-description`}
            />
            <div className="ml-2">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {mode.label}
              </div>
              <div
                id={`mode-${mode.value}-description`}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {mode.description}
              </div>
            </div>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
