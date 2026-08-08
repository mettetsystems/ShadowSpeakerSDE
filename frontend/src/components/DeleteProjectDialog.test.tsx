import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteProjectDialog } from './DeleteProjectDialog';

describe('DeleteProjectDialog', () => {
  it('requires the exact project name before enabling delete', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DeleteProjectDialog
        project={{ id: 'proj_1', name: 'Harbor Lights' }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole('button', { name: 'Delete project' });
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText(/Type Harbor Lights to confirm/),
      'Harbor Light',
    );
    expect(confirm).toBeDisabled();

    await user.clear(screen.getByLabelText(/Type Harbor Lights to confirm/));
    await user.type(
      screen.getByLabelText(/Type Harbor Lights to confirm/),
      'Harbor Lights',
    );
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels without deleting', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DeleteProjectDialog
        project={{ id: 'proj_1', name: 'Harbor Lights' }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
