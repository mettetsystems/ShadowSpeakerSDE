import { useDraggable } from '@dnd-kit/core';
import { BLOCK_TYPE_LABELS, type BlockTemplate, type BlockType } from '../types';

interface BlockBinsProps {
  templates: BlockTemplate[];
  onAddToSelectedChapter: (templateId: string) => void;
  selectedChapterId: string | null;
}

export function BlockBins({
  templates,
  onAddToSelectedChapter,
  selectedChapterId,
}: BlockBinsProps) {
  return (
    <aside className="block-bins" aria-label="Block bins">
      <header className="panel-header">
        <h2>Block bins</h2>
      </header>
      <p className="hint">
        Drag a template into a chapter, or use Add with a chapter selected.
      </p>
      <ul className="bin-list">
        {templates.map((template) => (
          <BinItem
            key={template.id}
            template={template}
            disabled={!selectedChapterId}
            onAdd={() => onAddToSelectedChapter(template.id)}
          />
        ))}
      </ul>
      <section className="local-store">
        <h3>Local Block Store</h3>
        <p className="hint">
          Project templates only. Remote marketplace APIs are intentionally not
          wired in this MVP.
        </p>
        <ul>
          {templates.map((template) => (
            <li key={`store-${template.id}`}>
              {template.name}{' '}
              <span className="muted">({BLOCK_TYPE_LABELS[template.block_type as BlockType]})</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function BinItem({
  template,
  onAdd,
  disabled,
}: {
  template: BlockTemplate;
  onAdd: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template:${template.id}`,
    data: { kind: 'template', templateId: template.id },
  });

  return (
    <li
      ref={setNodeRef}
      className={`bin-item${isDragging ? ' dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div>
        <strong>{template.name}</strong>
        <div className="muted">{BLOCK_TYPE_LABELS[template.block_type]}</div>
      </div>
      <button type="button" disabled={disabled} onClick={onAdd}>
        Add
      </button>
    </li>
  );
}
