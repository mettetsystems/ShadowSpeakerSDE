import type { ReviewWarning } from '../types';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

interface ReviewPanelProps {
  warnings: ReviewWarning[];
  onClose: () => void;
  onSelectChapter: (chapterId: string) => void;
  onSelectBlock: (blockId: string) => void;
}

export function ReviewPanel({
  warnings,
  onClose,
  onSelectChapter,
  onSelectBlock,
}: ReviewPanelProps) {
  const { open, toggle } = useCollapsiblePanel(true);

  return (
    <aside
      className={`review-panel${open ? '' : ' panel-collapsed'}`}
      aria-label="Review warnings"
    >
      <CollapsiblePanelHeader
        title="Review"
        open={open}
        onToggle={toggle}
        showActionsWhenCollapsed
        actions={
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        }
      />
      {open ? (
        warnings.length === 0 ? (
          <p className="empty">No soft-lock warnings. Craft selections look clean.</p>
        ) : (
          <ul className="review-list">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>
                <p>{warning.message}</p>
                <div className="button-row">
                  {warning.chapter_id ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onSelectChapter(warning.chapter_id!)}
                    >
                      Open chapter
                    </button>
                  ) : null}
                  {warning.block_id ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onSelectBlock(warning.block_id!)}
                    >
                      Open block
                    </button>
                  ) : null}
                </div>
                <span className="muted">{warning.code}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </aside>
  );
}
