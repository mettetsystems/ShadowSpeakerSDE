import { useRef } from 'react';
import type { Subplot } from '../types';
import { PLOT_ARCHETYPES, plotArchetypeOptionLabel } from '../plotArchetypes';
import { usePanelAutosave } from '../hooks/usePanelAutosave';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

const MAX_PHASES = 10;

export type SubplotPatch = {
  name?: string;
  description?: string;
  phases?: { id: string; description: string }[];
  plot_archetype?: string;
  delta?: string;
  inciting_incident?: string;
  macguffin?: string;
  plot_twist?: string;
  deus_ex_machina?: string;
};

interface SubplotPanelProps {
  subplot: Subplot;
  onClose: () => void;
  onSave: (patch: SubplotPatch) => void;
  onAddPhase: () => void;
}

function collectSubplotPatch(
  form: HTMLFormElement,
  subplot: Subplot,
): SubplotPatch | null {
  const data = new FormData(form);
  const get = (name: string) => String(data.get(name) ?? '');
  const patch: SubplotPatch = {};

  const name = get('name').trim();
  if (name && name !== subplot.name) patch.name = name;

  const description = get('description');
  if (description !== subplot.description) patch.description = description;

  const plotArchetype = get('plot_archetype');
  if (plotArchetype !== (subplot.plot_archetype ?? '')) {
    patch.plot_archetype = plotArchetype;
  }

  const delta = get('delta');
  if (delta !== (subplot.delta ?? '')) patch.delta = delta;

  const inciting = get('inciting_incident');
  if (inciting !== (subplot.inciting_incident ?? '')) {
    patch.inciting_incident = inciting;
  }

  const macguffin = get('macguffin');
  if (macguffin !== (subplot.macguffin ?? '')) patch.macguffin = macguffin;

  const plotTwist = get('plot_twist');
  if (plotTwist !== (subplot.plot_twist ?? '')) patch.plot_twist = plotTwist;

  const deus = get('deus_ex_machina');
  if (deus !== (subplot.deus_ex_machina ?? '')) patch.deus_ex_machina = deus;

  const phases: { id: string; description: string }[] = [];
  for (const phase of subplot.phases ?? []) {
    const next = get(`phase_${phase.id}`);
    if (next !== phase.description) {
      phases.push({ id: phase.id, description: next });
    }
  }
  if (phases.length > 0) patch.phases = phases;

  return Object.keys(patch).length > 0 ? patch : null;
}

export function SubplotPanel({ subplot, onClose, onSave, onAddPhase }: SubplotPanelProps) {
  const phases = subplot.phases ?? [];
  const atCap = phases.length >= MAX_PHASES;
  const { open, toggle } = useCollapsiblePanel(true);
  const formRef = useRef<HTMLFormElement>(null);
  const subplotRef = useRef(subplot);
  subplotRef.current = subplot;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const { markDirty, flushIfDirty } = usePanelAutosave(() => {
    const form = formRef.current;
    if (!form) return;
    const patch = collectSubplotPatch(form, subplotRef.current);
    if (patch) onSaveRef.current(patch);
  });

  function handleClose() {
    flushIfDirty();
    onClose();
  }

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
          <button type="button" className="ghost" onClick={handleClose}>
            Close
          </button>
        }
      />

      <form
        ref={formRef}
        className="stack"
        hidden={!open}
        onInput={markDirty}
        onChange={markDirty}
        onSubmit={(event) => event.preventDefault()}
      >
        <label>
          Name
          <input
            name="name"
            aria-label="Subplot name"
            key={`name-${subplot.id}`}
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
            name="description"
            aria-label="Subplot description"
            key={`desc-${subplot.id}`}
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
              name="plot_archetype"
              aria-label="Plot archetype"
              key={`arch-${subplot.id}`}
              defaultValue={subplot.plot_archetype ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                if (value !== (subplot.plot_archetype ?? '')) {
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
              name="delta"
              aria-label="Delta"
              key={`delta-${subplot.id}`}
              defaultValue={subplot.delta ?? ''}
              rows={3}
              placeholder="How this plot diverges from the template…"
              onBlur={(event) => {
                if (event.target.value !== (subplot.delta ?? '')) {
                  onSave({ delta: event.target.value });
                }
              }}
            />
          </label>
        </div>

        <label>
          Inciting Incident
          <textarea
            name="inciting_incident"
            aria-label="Inciting Incident"
            key={`ii-${subplot.id}`}
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
            name="macguffin"
            aria-label="MacGuffin"
            key={`mac-${subplot.id}`}
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
            name="plot_twist"
            aria-label="Plot Twist (Peripeteia)"
            key={`twist-${subplot.id}`}
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
            name="deus_ex_machina"
            aria-label="Deus ex Machina"
            key={`deus-${subplot.id}`}
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
                name={`phase_${phase.id}`}
                aria-label={`Phase ${index + 1} description`}
                key={phase.id}
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
      </form>
    </aside>
  );
}
