// ══════════════════════════════════════════════
// CONTEXT-LENGTH SWEEP CHART
// ══════════════════════════════════════════════
// Re-runs computeMetrics() at a range of context lengths (holding output
// tokens and RPS fixed) to show how KV memory demand grows — the concurrency
// count itself re-derives naturally via Little's Law at each point, since
// longer contexts also raise E2E latency.
let sweepChart = null;

function fmtCtxLabel(n) {
  return n >= 1024 ? (n/1024).toFixed(0)+'k' : String(n);
}

function renderSweepChart(baseCfg) {
  const canvas = g('sweep-chart');
  if (!canvas) return;
  if (sweepChart) { sweepChart.destroy(); sweepChart = null; }

  const points = SWEEP_CONTEXT_LENGTHS.map(ctxLen => {
    const outTok = Math.min(baseCfg.outTok, Math.max(1, ctxLen - 1));
    const inTok  = Math.max(1, ctxLen - outTok);
    const cfg = Object.assign({}, baseCfg, { inTok, outTok });
    const r = computeMetrics(cfg);
    return { ctxLen, requiredKVGB: r.requiredKVGB, kvBudgetGB: r.kvBudgetGB, memUtil: r.memUtil };
  });

  const labels   = points.map(p => fmtCtxLabel(p.ctxLen));
  const kvUsed   = points.map(p => +p.requiredKVGB.toFixed(2));
  const kvBudget = points.map(p => +p.kvBudgetGB.toFixed(2));
  const overBudgetIdx = points.findIndex(p => p.requiredKVGB > p.kvBudgetGB);

  g('sweep-note').textContent = overBudgetIdx === -1
    ? 'KV cache stays within budget across the full 1k–128k sweep at the current concurrency.'
    : `KV cache exceeds budget starting around ${fmtCtxLabel(points[overBudgetIdx].ctxLen)} tokens of context at the current RPS/concurrency.`;

  sweepChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'KV Cache Required (GB)',
          data: kvUsed,
          borderColor: '#bc8cff',
          backgroundColor: 'rgba(188,140,255,.15)',
          pointBackgroundColor: points.map(p => p.requiredKVGB > p.kvBudgetGB ? '#f85149' : '#bc8cff'),
          fill: true, tension: 0.25,
        },
        {
          label: 'KV Cache Budget (GB)',
          data: kvBudget,
          borderColor: '#6e7681',
          borderDash: [6,4],
          pointRadius: 0,
          fill: false, tension: 0,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#c9d1d9' } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw.toFixed(1)} GB` } },
      },
      scales: {
        x: { title: { display:true, text:'Context length (input+output tokens)', color:'#8b949e' }, grid:{color:'rgba(48,54,61,.5)'}, ticks:{color:'#8b949e'} },
        y: { title: { display:true, text:'GB', color:'#8b949e' }, grid:{color:'rgba(48,54,61,.5)'}, ticks:{color:'#8b949e'} },
      },
    },
  });
}
