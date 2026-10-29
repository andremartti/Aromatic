"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface Base {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}

function Wrap({ id, label, hint, error, optional, children }: Base & { children: ReactNode }) {
  return (
    <div className="form-field" data-invalid={error ? "" : undefined}>
      <label htmlFor={id}>
        {label}
        {optional ? <span className="form-optional"> (opcional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="form-error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="form-hint">{hint}</p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({ id, label, hint, error, optional, ...input }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrap id={id} label={label} hint={hint} error={error} optional={optional}>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} required={!optional} {...input} />
    </Wrap>
  );
}

export function TextArea({ id, label, hint, error, optional, ...input }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrap id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} required={!optional} rows={2} {...input} />
    </Wrap>
  );
}

export function SelectField({ id, label, hint, error, optional, children, ...input }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrap id={id} label={label} hint={hint} error={error} optional={optional}>
      <select id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} required={!optional} {...input}>
        {children}
      </select>
    </Wrap>
  );
}
