import { SectionCard, InfoTip } from '../../../components/ui';

const COLORES = {
  prophet:      { bg: '#10b98122', fg: '#059669', label: 'Prophet' },
  holt_winters: { bg: '#f59e0b22', fg: '#d97706', label: 'Holt-Winters' },
  fallback:     { bg: '#94a3b822', fg: '#475569', label: 'Fallback lineal' },
};

export default function PanelModeloML({ metaModelos }) {
  if (!metaModelos || !metaModelos.length) {
    return (
      <SectionCard title="Modelo de pronóstico">
        <div style={{ color: 'var(--text-tertiary)', padding: 12, fontSize: 13 }}>
          Sin métricas de modelo todavía. Generá una recomendación para entrenar los modelos.
        </div>
      </SectionCard>
    );
  }

  // Agrupar por modelo
  const porModelo = metaModelos.reduce((acc, m) => {
    const k = m.modelo || 'fallback';
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});

  // Calcular MAPE promedio del modelo Prophet (es el único con backtesting real)
  const prophetEntries = porModelo.prophet || [];
  const mapeValues = prophetEntries
    .map((m) => parseFloat(m.metricas?.mape))
    .filter((v) => !isNaN(v));
  const mapePromedio = mapeValues.length
    ? mapeValues.reduce((s, v) => s + v, 0) / mapeValues.length
    : null;

  const mejor = prophetEntries
    .filter((m) => m.metricas?.mape != null)
    .sort((a, b) => parseFloat(a.metricas.mape) - parseFloat(b.metricas.mape))[0];

  return (
    <SectionCard
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Modelo de pronóstico
          <InfoTip text="El sistema selecciona automáticamente qué modelo usar para cada corte según cuántos datos tenga: Prophet con ≥1 año (con backtesting MAE/MAPE), Holt-Winters con menos, fallback lineal con muy pocos." />
        </span>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        {/* Tarjetas por modelo */}
        {Object.entries(porModelo).map(([modelo, items]) => {
          const c = COLORES[modelo] || COLORES.fallback;
          return (
            <div key={modelo} style={{
              flex: '1 1 200px',
              padding: '14px 16px', borderRadius: 8,
              background: c.bg, border: `1px solid ${c.fg}33`,
            }}>
              <div style={{ fontSize: 11, color: c.fg, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {c.label}
              </div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: c.fg,
                            fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
                {items.length}
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 4 }}>
                  {items.length === 1 ? 'corte' : 'cortes'}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                {items.map((m) => m.corte_canonico).join(' · ')}
              </div>
            </div>
          );
        })}

        {/* Tarjeta MAPE promedio (Prophet) */}
        {mapePromedio != null && (
          <div style={{
            flex: '1 1 220px',
            padding: '14px 16px', borderRadius: 8,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700,
                              letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Error promedio (MAPE)
              </span>
              <InfoTip text="MAPE = Mean Absolute Percentage Error. Mide qué tan lejos quedaron las predicciones del precio real durante el backtesting (entrenar con todo menos 7 días, predecir esos 7, comparar). Cuanto más bajo, mejor: <5% es excelente." />
            </div>
            <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700,
                          color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
              {mapePromedio.toFixed(2)}
              <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 400 }}>%</span>
            </div>
            {mejor && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                Mejor: <strong>{mejor.corte_canonico}</strong> con MAPE {parseFloat(mejor.metricas.mape).toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
