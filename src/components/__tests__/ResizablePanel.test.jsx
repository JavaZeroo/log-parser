import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ResizablePanel } from '../ResizablePanel';

describe('ResizablePanel', () => {
  it('renders content and adjusts height with keyboard', async () => {
    const user = userEvent.setup();
    render(
      <ResizablePanel title="Test" initialHeight={300}>
        <div>content</div>
      </ResizablePanel>
    );

    const region = screen.getByRole('region', { name: /Test/ });
    expect(region.style.height).toBe('300px');
    screen.getByText('content');

    const handle = screen.getByRole('button', { name: '调整 Test 图表高度' });
    handle.focus();
    await user.keyboard('{ArrowUp}');
    expect(region.style.height).toBe('290px');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(region.style.height).toBe('310px');

    cleanup();
  });

  it('resizes using mouse drag', () => {
    render(
      <ResizablePanel title="Test" initialHeight={300}>
        <div>content</div>
      </ResizablePanel>
    );

    const region = screen.getByRole('region', { name: /Test/ });
    const handle = screen.getByRole('button', { name: '调整 Test 图表高度' });

    fireEvent.mouseDown(handle, { clientY: 0 });
    fireEvent.mouseMove(document, { clientY: 40 });
    fireEvent.mouseUp(document);

    expect(region.style.height).toBe('340px');

    cleanup();
  });
});
