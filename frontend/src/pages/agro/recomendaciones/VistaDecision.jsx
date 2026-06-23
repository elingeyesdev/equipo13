import React from 'react';
import RecomendacionCard from './RecomendacionCard.jsx';

export default function VistaDecision({ items, metaModelos, historico, alertas, horizonte }) {
  if (!items || items.length === 0) {
    return null;
  }

  // The items passed should already be ranked via rankItems(items)
  return (
    <div className="grid-decision" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
      {items.map((it, i) => (
        <RecomendacionCard
          key={i}
          item={it}
          metaModelos={metaModelos}
          historico={historico}
          alertas={alertas}
          horizonte={horizonte}
        />
      ))}
    </div>
  );
}
