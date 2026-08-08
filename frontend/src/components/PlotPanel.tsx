import type { Plot } from '../types';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

interface PlotPanelProps {
  plot: Plot;
  onClose: () => void;
  onSave: (patch: {
    name?: string;
    description?: string;
    inciting_incident?: string;
    macguffin?: string;
    plot_twist?: string;
    deus_ex_machina?: string;
  }) => void;
}

function CraftField({
  label,
  value,
  onBlur,
}: {
  label: string;
  value: string;
  onBlur: (next: string) => void;
}) {
  return (
    <label>
      {label}
      <textarea
        aria-label={label}
        key={`${label}-${value}`}
        defaultValue={value}
        rows={2}
        onBlur={(event) => {
          if (event.target.value !== value) onBlur(event.target.value);
        }}
      />
    </label>
  );
}

export function PlotPanel({ plot, onClose, onSave }: PlotPanelProps) {
  const { open, toggle } = useCollapsiblePanel(true);

  return (
    <aside className={`plot-panel${open ? '' : ' panel-collapsed'}`} aria-label="Plot editor">
      <CollapsiblePanelHeader
        title="Plot"
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
        <div className="stack">
          <label>
            Name
            <input
              aria-label="Plot name"
              key={`name-${plot.id}-${plot.name}`}
              defaultValue={plot.name}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (value && value !== plot.name) onSave({ name: value });
              }}
            />
          </label>
          <label>
            Description
            <textarea
              aria-label="Plot description"
              key={`desc-${plot.id}-${plot.description}`}
              defaultValue={plot.description}
              rows={3}
              onBlur={(event) => {
                if (event.target.value !== plot.description) {
                  onSave({ description: event.target.value });
                }
              }}
            />
          </label>
          <CraftField
            label="Inciting Incident"
            value={plot.inciting_incident ?? ''}
            onBlur={(inciting_incident) => onSave({ inciting_incident })}
          />
          <CraftField
            label="MacGuffin"
            value={plot.macguffin ?? ''}
            onBlur={(macguffin) => onSave({ macguffin })}
          />
          <CraftField
            label="Plot Twist (Peripeteia)"
            value={plot.plot_twist ?? ''}
            onBlur={(plot_twist) => onSave({ plot_twist })}
          />
          <CraftField
            label="Deus ex Machina"
            value={plot.deus_ex_machina ?? ''}
            onBlur={(deus_ex_machina) => onSave({ deus_ex_machina })}
          />
        </div>
      ) : null}
    </aside>
  );
}
