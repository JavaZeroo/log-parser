import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { FileConfigModal } from '../FileConfigModal.jsx';

describe('FileConfigModal', () => {
  it('displays step range for log file', () => {
    const file = {
      id: '1',
      name: 'a.log',
      content: 'step: 70 loss: 1\nstep: 210 loss: 2'
    };
    render(
      <FileConfigModal
        file={file}
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        globalParsingConfig={{ metrics: [] }}
        stepKeyword="step:"
      />
    );
    expect(screen.getByText('当前日志包含步骤: 70 - 210')).toBeInTheDocument();
  });
});
