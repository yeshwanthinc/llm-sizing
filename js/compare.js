// ══════════════════════════════════════════════
// SIDE-BY-SIDE COMPARISON MODE
// ══════════════════════════════════════════════
// Shares the sidebar's workload/advanced settings across 2-3 slots that
// each vary GPU, model, precision, and GPU count — answers "which hardware
// / quantization wins for my workload" without re-typing the whole form.
let cmpSlots = [];
let cmpSlotSeq = 0;

function toggleCompareMode() {
  const panel = g('cmp-panel');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  g('compare-btn').classList.toggle('active', !isOpen);
  if (!isOpen && !cmpSlots.length) {
    addCompareSlot();
    addCompareSlot();
  }
}

function addCompareSlot() {
  if (cmpSlots.length >= 3) { showToast('Max 3 configs in comparison mode'); return; }
  cmpSlots.push('cmp-slot-' + (cmpSlotSeq++));
  renderCompareSlots();
}

function removeCompareSlot(id) {
  cmpSlots = cmpSlots.filter(s => s !== id);
  renderCompareSlots();
}

function renderCompareSlots() {
  const curModel = g('model') ? g('model').value : null;
  const curGPU   = g('gpu')   ? g('gpu').value   : null;
  g('cmp-slots').innerHTML = cmpSlots.map((id, idx) => `
    <div class="cmp-slot" id="${id}">
      <div class="cmp-slot-hdr">
        <b>Config ${String.fromCharCode(65+idx)}</b>
        ${cmpSlots.length > 1 ? `<button class="saved-item-del" onclick="removeCompareSlot('${id}')">✕ Remove</button>` : ''}
      </div>
      <div class="field"><label>Model</label>
        <select class="cmp-model">${buildModelOptionsHTML(curModel)}</select></div>
      <div class="field"><label>GPU</label>
        <select class="cmp-gpu">${buildGPUOptionsHTML(curGPU)}</select></div>
      <div class="row2">
        <div class="field"><label>Precision</label>
          <select class="cmp-prec">
            <option value="fp16" selected>FP16</option>
            <option value="bf16">BF16</option>
            <option value="fp8">FP8</option>
            <option value="int8">INT8</option>
            <option value="int4">INT4/AWQ</option>
          </select>
        </div>
        <div class="field"><label># GPUs</label>
          <input type="number" class="cmp-numgpus" value="8" min="1" max="512"></div>
      </div>
    </div>
  `).join('');
  g('cmp-add-btn').style.display = cmpSlots.length >= 3 ? 'none' : 'inline-block';
}

function runComparison() {
  if (cmpSlots.length < 2) { alert('Add at least 2 configs to compare.'); return; }
  const results = cmpSlots.map((id, idx) => {
    const el = g(id);
    const gpuKey   = el.querySelector('.cmp-gpu').value;
    const modelKey = el.querySelector('.cmp-model').value;
    const prec     = el.querySelector('.cmp-prec').value;
    const numGPUs  = parseFloat(el.querySelector('.cmp-numgpus').value) || 1;
    const cfg = readMainConfig({ gpuKey, modelKey, prec, kvPrec: prec, numGPUs });
    if (!cfg.gpu || !cfg.m || !cfg.m.p) return null;
    const r = computeMetrics(cfg);
    r.cmpLabel = `${String.fromCharCode(65+idx)}`;
    r.cmpDesc  = `${modelKey} · ${gpuKey} · ${prec.toUpperCase()} · ${numGPUs}×`;
    return r;
  }).filter(Boolean);

  if (results.length < 2) { alert('Select a valid GPU and model in at least 2 slots.'); return; }
  renderComparisonTable(results);
}

const CMP_ROWS = [
  { label: 'Spare Capacity',        get: r => r.spareCapPct,        fmt: v => v.toFixed(1)+'%',      dir: 'high' },
  { label: 'Max RPS',               get: r => r.maxRPS,             fmt: v => fmtK(v),               dir: 'high' },
  { label: 'Bottleneck',            get: r => r.bottleneck,         fmt: v => v,                     dir: null   },
  { label: 'Memory Utilization',    get: r => r.memUtil*100,        fmt: v => v.toFixed(1)+'%',      dir: 'low'  },
  { label: 'Time to First Token',   get: r => r.ttft,               fmt: v => fmtMs(v),              dir: 'low'  },
  { label: 'Time Between Tokens',   get: r => r.tbt,                fmt: v => fmtMs(v),              dir: 'low'  },
  { label: 'End-to-End Latency',    get: r => r.e2eLatency,         fmt: v => fmtMs(v),              dir: 'low'  },
  { label: 'Total GPU Memory',      get: r => r.totalMemGB,         fmt: v => fmtGB(v),              dir: null   },
  { label: 'Cost / hour',           get: r => r.costPerHr,          fmt: v => '$'+v.toFixed(2),      dir: 'low'  },
  { label: 'Cost / 1M output tok',  get: r => r.costPerMTok,        fmt: v => '$'+v.toFixed(2),      dir: 'low'  },
];

function renderComparisonTable(results) {
  const header = results.map(r => `<th>${r.cmpLabel}<br><span>${esc(r.cmpDesc)}</span></th>`).join('');
  const rows = CMP_ROWS.map(row => {
    const vals = results.map(r => row.get(r));
    let bestVal = null;
    if (row.dir === 'high') bestVal = Math.max(...vals.filter(v => typeof v === 'number'));
    if (row.dir === 'low')  bestVal = Math.min(...vals.filter(v => typeof v === 'number'));
    const cells = vals.map(v => {
      const isBest = row.dir && typeof v === 'number' && v === bestVal;
      return `<td class="${isBest ? 'cmp-best' : ''}">${row.fmt(v)}</td>`;
    }).join('');
    return `<tr><td class="cmp-row-label">${row.label}</td>${cells}</tr>`;
  }).join('');

  g('cmp-results').innerHTML = `
    <div class="cmp-table-wrap">
      <table class="cmp-table">
        <thead><tr><th></th>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
