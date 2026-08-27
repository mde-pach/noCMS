import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="ed-field">
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the control is nested inside */}
      <label className="ed-field__label">
        <span className="ed-field__name">{label}</span>
        {children}
      </label>
      {hint ? <p className="ed-field__hint">{hint}</p> : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  // An explicit type, so `input[type=text]` matches — React omits the attribute otherwise.
  return (
    <input
      type="text"
      {...props}
      className={`ed-input ${props.className ?? ""}`.trim()}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`ed-input ed-input--area ${props.className ?? ""}`.trim()}
    />
  );
}

export function Select({
  options,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select {...rest} className={`ed-input ${rest.className ?? ""}`.trim()}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** A prop the editor may show but not change — §4.10 working, not an apology. */
export function LockedValue({ children }: { children: ReactNode }) {
  return <div className="ed-locked">{children}</div>;
}
