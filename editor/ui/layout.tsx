import type { ReactNode } from "react";
import { useEffect } from "react";

export function Group({ children }: { children: ReactNode }) {
  return <p className="ed-group">{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="ed-empty">{children}</p>;
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="ed-row">{children}</div>;
}

export function Tabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (next: string) => void;
  tabs: { id: string; label: string }[];
}) {
  return (
    <div className="ed-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`e-tab-${tab.id}`}
          aria-selected={value === tab.id}
          className="ed-tab"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Dialog({
  title,
  description,
  children,
  onClose,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ed-sheet">
      {/* A real control rather than a clickable div: the backdrop closes the dialog. */}
      <button
        type="button"
        className="ed-sheet__scrim"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="ed-sheet__box"
        role="dialog"
        aria-modal="true"
        aria-label={String(title)}
      >
        <h3 className="ed-sheet__title">{title}</h3>
        {description ? <p className="ed-sheet__desc">{description}</p> : null}
        {children}
        <div className="ed-row ed-row--end">{footer}</div>
      </div>
    </div>
  );
}
