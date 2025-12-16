import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, Settings2, LineChart, GitCompare } from 'lucide-react';

export function GuideModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const sections = [
    {
      icon: UploadCloud,
      title: t('guide.upload.title'),
      desc: t('guide.upload.desc'),
      bullets: [
        t('guide.upload.bullet1'),
        t('guide.upload.bullet2'),
        t('guide.upload.bullet3')
      ]
    },
    {
      icon: Settings2,
      title: t('guide.configure.title'),
      desc: t('guide.configure.desc'),
      bullets: [
        t('guide.configure.bullet1'),
        t('guide.configure.bullet2'),
        t('guide.configure.bullet3')
      ]
    },
    {
      icon: LineChart,
      title: t('guide.visualize.title'),
      desc: t('guide.visualize.desc'),
      bullets: [
        t('guide.visualize.bullet1'),
        t('guide.visualize.bullet2'),
        t('guide.visualize.bullet3')
      ]
    },
    {
      icon: GitCompare,
      title: t('guide.compare.title'),
      desc: t('guide.compare.desc'),
      bullets: [
        t('guide.compare.bullet1'),
        t('guide.compare.bullet2'),
        t('guide.compare.bullet3')
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 bg-black/50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t('guide.title')}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
              {t('guide.subtitle')}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {t('guide.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {t('guide.lead')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            aria-label={t('guide.close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-6">
          {sections.map(({ icon: Icon, title, desc, bullets }) => (
            <article key={title} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{desc}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 text-blue-500" aria-hidden="true">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 dark:bg-gray-800/70 rounded-b-2xl">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {t('guide.footer')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('guide.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
