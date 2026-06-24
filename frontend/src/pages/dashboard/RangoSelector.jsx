import React from 'react';

const OPCIONES = [
  { value: '7d',   label: '7d' },
  { value: '30d',  label: '30d' },
  { value: '90d',  label: '90d' },
  { value: 'todo', label: 'Todo' },
];

const RangoSelector = ({ value, onChange }) => (
  <div style={{
    display: 'inline-flex',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '2px',
    gap: '2px',
  }}>
    {OPCIONES.map(op => {
      const activo = op.value === value;
      return (
        <button
          key={op.value}
          type="button"
          onClick={() => onChange(op.value)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: activo ? 600 : 500,
            color: activo ? 'var(--text-primary)' : 'var(--text-tertiary)',
            background: activo ? 'var(--bg-secondary)' : 'transparent',
            border: activo ? '1px solid var(--border-subtle)' : '1px solid transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {op.label}
        </button>
      );
    })}
  </div>
);

export default RangoSelector;
