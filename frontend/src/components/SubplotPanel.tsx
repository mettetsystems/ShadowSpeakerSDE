import type { Subplot } from '../types';
import { PLOT_ARCHETYPES, plotArchetypeOptionLabel } from '../plotArchetypes';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

const MAX_PHASES = 10;

interface SubplotPanelProps {
  subplot: Subplot;
  onClose: () => void;
  onSave: (patch: {
    name?: string;
    description?: string;
    phases?: { id: string; description: string }[];
    plot_archetype?: string;
    delta?: string;
    inciting_incident?: string;
    macguffin?: string;
    plot_twist?: string;
    deus_ex_machina?: string;
  }) => void;
  onAddPhase: () => void;
}

export function SubplotPanel({ subplot, onClose, onSave, onAddPhase }: SubplotPanelProps) {
  const phases = subplot.phases ?? [];
  const atCap = phases.length >= MAX_PHASES;
  const { open, toggle } = useCollapsiblePanel(true);
  const archetype = subplot.plot_archetype ?? '';
  const delta = subplot.delta ?? '';

  return (
    <aside
      className={`subplot-panel${open ? '' : ' panel-collapsed'}`}
      aria-label="Subplot editor"
    >
      <CollapsiblePanelHeader
        title="Subplot"
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
            aria-label="Subplot name"
            key={`name-${subplot.id}-${subplot.name}`}
            defaultValue={subplot.name}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value && value !== subplot.name) {
                onSave({ name: value });
              }
            }}
          />
        </label>
        <label>
          Description
          <textarea
            aria-label="Subplot description"
            key={`desc-${subplot.id}-${subplot.description}`}
            defaultValue={subplot.description}
            rows={3}
            onBlur={(event) => {
              if (event.target.value !== subplot.description) {
                onSave({ description: event.target.value });
              }
            }}
          />
        </label>

        <div className="subplot-archetype-row">
          <label>
            Plot archetype
            <select
              aria-label="Plot archetype"
              key={`arch-${subplot.id}-${archetype}`}
              defaultValue={archetype}
              onChange={(event) => {
                const value = event.target.value;
                if (value !== archetype) {
                  onSave({ plot_archetype: value });
                }
              }}
            >
              <option value="">Select an archetype…</option>
              {PLOT_ARCHETYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {plotArchetypeOptionLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Delta
            <textarea
              aria-label="Delta"
              key={`delta-${subplot.id}-${delta}`}
              defaultValue={delta}
              rows={3}
              placeholder="How this plot diverges from the template…"
              onBlur={(event) => {
                if (event.target.value !== delta) {
                  onSave({ delta: event.target.value });
                }
              }}
            />
          </label>
        </div>

        <label>
          Inciting Incident
          <textarea
            aria-label="Inciting Incident"
            key={`ii-${subplot.inciting_incident}`}
            defaultValue={subplot.inciting_incident ?? ''}
            rows={2}
            onBlur={(event) => {
              if (event.target.value !== (subplot.inciting_incident ?? '')) {
                onSave({ inciting_incident: event.target.value });
              }
            }}
          />
        </label>
        <label>
          MacGuffin
          <textarea
            aria-label="MacGuffin"
            key={`mac-${subplot.macguffin}`}
            defaultValue={subplot.macguffin ?? ''}
            rows={2}
            onBlur={(event) => {
              if (event.target.value !== (subplot.macguffin ?? '')) {
                onSave({ macguffin: event.target.value });
              }
            }}
          />
        </label>
        <label>
          Plot Twist (Peripeteia)
          <textarea
            aria-label="Plot Twist (Peripeteia)"
            key={`twist-${subplot.plot_twist}`}
            defaultValue={subplot.plot_twist ?? ''}
            rows={2}
            onBlur={(event) => {
              if (event.target.value !== (subplot.plot_twist ?? '')) {
                onSave({ plot_twist: event.target.value });
              }
            }}
          />
        </label>
        <label>
          Deus ex Machina
          <textarea
            aria-label="Deus ex Machina"
            key={`deus-${subplot.deus_ex_machina}`}
            defaultValue={subplot.deus_ex_machina ?? ''}
            rows={2}
            onBlur={(event) => {
              if (event.target.value !== (subplot.deus_ex_machina ?? '')) {
                onSave({ deus_ex_machina: event.target.value });
              }
            }}
          />
        </label>

        <div className="subplot-phases">
          <div className="panel-header tight">
            <h3>Phases</h3>
            <span className="muted">
              {phases.length} / {MAX_PHASES}
            </span>
          </div>
          {phases.map((phase, index) => (
            <label key={phase.id}>
              Phase {index + 1}
              <input
                aria-label={`Phase ${index + 1} description`}
                key={`${phase.id}-${phase.description}`}
                defaultValue={phase.description}
                placeholder="Short description…"
                onBlur={(event) => {
                  if (event.target.value !== phase.description) {
                    onSave({
                      phases: [{ id: phase.id, description: event.target.value }],
                    });
                  }
                }}
              />
            </label>
          ))}
          <button type="button" disabled={atCap} onClick={onAddPhase} aria-label="Add phase">
            + Add phase
          </button>
        </div>
      </div>
      ) : null}
    </aside>
  );
}
