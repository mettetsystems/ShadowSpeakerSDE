import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePanelAutosave, PANEL_AUTOSAVE_INTERVAL_MS } from './usePanelAutosave';
import { SubplotPanel } from '../components/SubplotPanel';
import type { Subplot } from '../types';

function Probe({
  flush,
  intervalMs,
}: {
  flush: () => void;
  intervalMs?: number;
}) {
  const { markDirty } = usePanelAutosave(flush, intervalMs);
  return (
    <button type="button" onClick={markDirty}>
      dirty
    </button>
  );
}

describe('usePanelAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes dirty edits on the interval and on unmount', () => {
    const flush = vi.fn();
    const { unmount } = render(<Probe flush={flush} />);

    act(() => {
      vi.advanceTimersByTime(PANEL_AUTOSAVE_INTERVAL_MS);
    });
    expect(flush).not.toHaveBeenCalled();

    act(() => {
      screen.getByRole('button', { name: 'dirty' }).click();
    });
    act(() => {
      vi.advanceTimersByTime(PANEL_AUTOSAVE_INTERVAL_MS);
    });
    expect(flush).toHaveBeenCalledTimes(1);

    act(() => {
      screen.getByRole('button', { name: 'dirty' }).click();
    });
    unmount();
    expect(flush).toHaveBeenCalledTimes(2);
  });
});

describe('subplot panel autosave', () => {
  const subplot: Subplot = {
    id: 'sub_1',
    name: 'Debt',
    description: '',
    chapter_ids: [],
    related_subplot_ids: [],
    phases: [
      { id: 'ph_1', description: '' },
      { id: 'ph_2', description: '' },
      { id: 'ph_3', description: '' },
    ],
    plot_archetype: '',
    delta: '',
    inciting_incident: '',
    macguffin: '',
    plot_twist: '',
    deus_ex_machina: '',
  };

  it('saves pending edits when the panel closes without blur', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <SubplotPanel
        subplot={subplot}
        onClose={onClose}
        onSave={onSave}
        onAddPhase={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Subplot description'), 'Quiet ledger');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onSave).toHaveBeenCalledWith({ description: 'Quiet ledger' });
    expect(onClose).toHaveBeenCalled();
  });
});
