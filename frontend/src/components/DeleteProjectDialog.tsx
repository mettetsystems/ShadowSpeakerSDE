import { useEffect, useId, useState, type FormEvent } from 'react';
import type { ProjectSummary } from '../api';

interface DeleteProjectDialogProps {
  project: ProjectSummary;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function DeleteProjectDialog({
  project,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteProjectDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const [typedName, setTypedName] = useState('');
  const matches = typedName === project.name;

  useEffect(() => {
    setTypedName('');
  }, [project.id, project.name]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!matches || busy) return;
    await onConfirm();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>Delete project</h2>
        <p>
          This permanently removes <strong>{project.name}</strong> and all of its chapters,
          blocks, and timeline data from disk. This cannot be undone.
        </p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor={inputId}>
            Type <strong>{project.name}</strong> to confirm
            <input
              id={inputId}
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="danger" disabled={!matches || busy}>
              Delete project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
