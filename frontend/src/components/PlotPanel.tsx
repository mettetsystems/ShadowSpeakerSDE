import { useRef } from 'react';
import type { Plot } from '../types';
import { usePanelAutosave } from '../hooks/usePanelAutosave';
import { CollapsiblePanelHeader, useCollapsiblePanel } from './CollapsiblePanel';

export type PlotPatch = {
  name?: string;
  description?: string;
  inciting_incident?: string;
  macguffin?: string;
  plot_twist?: string;
  deus_ex_machina?: string;
};

interface PlotPanelProps {
  plot: Plot;
  onClose: () => void;
  onSave: (patch: PlotPatch) => void;
}

function CraftField({
  name,
  label,
  value,
  onBlur,
}: {
  name: string;
  label: string;
  value: string;
  onBlur: (next: string) => void;
}) {
  return (
    <label>
      {label}
      <textarea
        name={name}
        aria-label={label}
        defaultValue={value}
        rows={2}
        onBlur={(event) => {
          if (event.target.value !== value) onBlur(event.target.value);
        }}
      />
    </label>
  );
}

function collectPlotPatch(form: HTMLFormElement, plot: Plot): PlotPatch | null {
  const data = new FormData(form);
  const get = (field: string) => String(data.get(field) ?? '');
  const patch: PlotPatch = {};

  const name = get('name').trim();
  if (name && name !== plot.name) patch.name = name;

  const description = get('description');
  if (description !== plot.description) patch.description = description;

  const inciting = get('inciting_incident');
  if (inciting !== (plot.inciting_incident ?? '')) patch.inciting_incident = inciting;

  const macguffin = get('macguffin');
  if (macguffin !== (plot.macguffin ?? '')) patch.macguffin = macguffin;

  const plotTwist = get('plot_twist');
  if (plotTwist !== (plot.plot_twist ?? '')) patch.plot_twist = plotTwist;

  const deus = get('deus_ex_machina');
  if (deus !== (plot.deus_ex_machina ?? '')) patch.deus_ex_machina = deus;

  return Object.keys(patch).length > 0 ? patch : null;
}

export function PlotPanel({ plot, onClose, onSave }: PlotPanelProps) {
  const { open, toggle } = useCollapsiblePanel(true);
  const formRef = useRef<HTMLFormElement>(null);
  const plotRef = useRef(plot);
  plotRef.current = plot;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const { markDirty, flushIfDirty } = usePanelAutosave(() => {
    const form = formRef.current;
    if (!form) return;
    const patch = collectPlotPatch(form, plotRef.current);
    if (patch) onSaveRef.current(patch);
  });

  function handleClose() {
    flushIfDirty();
    onClose();
  }

  return (
    <aside className={`plot-panel${open ? '' : ' panel-collapsed'}`} aria-label="Plot editor">
      <CollapsiblePanelHeader
        title="Plot"
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
            aria-label="Plot name"
            key={`name-${plot.id}`}
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
            name="description"
            aria-label="Plot description"
            key={`desc-${plot.id}`}
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
          name="inciting_incident"
          label="Inciting Incident"
          value={plot.inciting_incident ?? ''}
          onBlur={(inciting_incident) => onSave({ inciting_incident })}
        />
        <CraftField
          name="macguffin"
          label="MacGuffin"
          value={plot.macguffin ?? ''}
          onBlur={(macguffin) => onSave({ macguffin })}
        />
        <CraftField
          name="plot_twist"
          label="Plot Twist (Peripeteia)"
          value={plot.plot_twist ?? ''}
          onBlur={(plot_twist) => onSave({ plot_twist })}
        />
        <CraftField
          name="deus_ex_machina"
          label="Deus ex Machina"
          value={plot.deus_ex_machina ?? ''}
          onBlur={(deus_ex_machina) => onSave({ deus_ex_machina })}
        />
      </form>
    </aside>
  );
}
