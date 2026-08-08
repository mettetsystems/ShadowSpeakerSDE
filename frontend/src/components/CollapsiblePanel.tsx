import { useId, useState, type ReactNode } from 'react';

export function useCollapsiblePanel(defaultOpen: boolean) {
  const [open, setOpen] = useState(defaultOpen);
  return {
    open,
    setOpen,
    toggle: () => setOpen((current) => !current),
  };
}

interface CollapsiblePanelHeaderProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Extra actions shown while expanded (and optionally while collapsed). */
  actions?: ReactNode;
  showActionsWhenCollapsed?: boolean;
}

export function CollapsiblePanelHeader({
  title,
  open,
  onToggle,
  actions,
  showActionsWhenCollapsed = false,
}: CollapsiblePanelHeaderProps) {
  const label = open ? `Collapse ${title}` : `Expand ${title}`;
  return (
    <header className="panel-header">
      <h2>{title}</h2>
      <div className="panel-header-actions">
        {open || showActionsWhenCollapsed ? actions : null}
        <button
          type="button"
          className="ghost panel-toggle"
          aria-expanded={open}
          aria-label={label}
          onClick={onToggle}
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>
    </header>
  );
}

interface CollapsiblePanelProps {
  title: string;
  className: string;
  ariaLabel: string;
  defaultOpen?: boolean;
  as?: 'section' | 'aside';
  headerActions?: ReactNode;
  showActionsWhenCollapsed?: boolean;
  children: ReactNode;
}

/** Shell for always-present workspace panels with collapse/expand chrome. */
export function CollapsiblePanel({
  title,
  className,
  ariaLabel,
  defaultOpen = false,
  as: Tag = 'section',
  headerActions,
  showActionsWhenCollapsed = false,
  children,
}: CollapsiblePanelProps) {
  const { open, toggle } = useCollapsiblePanel(defaultOpen);
  const bodyId = useId();

  return (
    <Tag
      className={`${className}${open ? '' : ' panel-collapsed'}`}
      aria-label={ariaLabel}
    >
      <CollapsiblePanelHeader
        title={title}
        open={open}
        onToggle={toggle}
        actions={headerActions}
        showActionsWhenCollapsed={showActionsWhenCollapsed}
      />
      <div id={bodyId} hidden={!open} className="panel-body">
        {children}
      </div>
    </Tag>
  );
}
