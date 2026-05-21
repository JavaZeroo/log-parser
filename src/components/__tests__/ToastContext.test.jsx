import React from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { ToastProvider, useToast } from '../ToastContext';

function Trigger({ type = 'info', message = 'hello', options }) {
  const toast = useToast();
  return (
    <button onClick={() => toast[type](message, options)}>fire</button>
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it('renders nothing without provider', () => {
    render(<Trigger />);
    expect(screen.queryByRole('region', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('shows and auto-dismisses a toast', async () => {
    render(
      <ToastProvider>
        <Trigger type="success" message="done!" options={{ duration: 1000 }} />
      </ToastProvider>
    );

    expect(screen.queryByText('done!')).not.toBeInTheDocument();
    await act(async () => {
      screen.getByText('fire').click();
    });
    expect(screen.getByText('done!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('done!')).not.toBeInTheDocument();
  });

  it('allows manual dismiss', async () => {
    render(
      <ToastProvider>
        <Trigger type="error" message="boom" options={{ duration: 0 }} />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText('fire').click();
    });
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/dismiss/i));
    });
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });

  it('supports multiple stacked toasts', async () => {
    render(
      <ToastProvider>
        <Trigger type="info" message="first" options={{ duration: 0 }} />
      </ToastProvider>
    );
    const btn = screen.getByText('fire');
    await act(async () => { btn.click(); btn.click(); btn.click(); });
    expect(screen.getAllByText('first')).toHaveLength(3);
  });
});
