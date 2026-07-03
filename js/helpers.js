// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function g(id)    { return document.getElementById(id) }
function getNum(id){ return parseFloat(g(id).value) || 0 }
function esc(s)   { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function fmtGB(n) {
  const b = n * 1e9;
  if(b >= 1e9) return n.toFixed(1)+' GB';
  if(b >= 1e6) return (b/1e6).toFixed(0)+' MB';
  if(b >= 1e3) return (b/1e3).toFixed(0)+' KB';
  return b.toFixed(0)+' B';
}
function fmtKV(gbPT) {
  const b = gbPT * 1e9;
  return b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : (b/1e3).toFixed(0)+' KB';
}
function fmtK(n)  { return n >= 1000 ? (n/1000).toFixed(1)+'k' : n.toFixed(0) }
function pct(n)   { return Math.min(999, n*100).toFixed(1)+'%' }
function fmtMs(s) { return s < 1 ? (s*1000).toFixed(0)+'ms' : s.toFixed(2)+'s' }
function fmtTPS(n){ if(n>=1e6) return (n/1e6).toFixed(1)+'M t/s'; if(n>=1e3) return (n/1e3).toFixed(1)+'k t/s'; return n.toFixed(0)+' t/s' }
function statusColor(v) { return v<=.70?'var(--green)':v<=.90?'var(--yellow)':'var(--red)' }
function spareClass(sp) { return sp>=30?'sg':sp>=10?'sy':'sr' }

// ══════════════════════════════════════════════
// SHARED CROSS-FEATURE HELPERS
// ══════════════════════════════════════════════
// Approximate inter-node MFU penalty when pipeline parallelism spans
// multiple nodes, keyed off the intra-node interconnect as a rough proxy
// for how well the cluster's fabric generally scales (a real deployment's
// inter-node fabric — e.g. InfiniBand — is a separate spec we don't collect).
function interconnectMFUPenalty(interconnect) {
  const ic = (interconnect || '').toLowerCase();
  if (ic.includes('nvlink 5') || ic.includes('nvlink 4')) return 0.95;
  if (ic.includes('nvlink'))  return 0.90;
  if (ic.includes('infinity fabric')) return 0.85;
  if (ic.includes('pcie'))    return 0.75;
  return 0.80;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

let toastTimer = null;
function showToast(msg) {
  let el = g('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// Build <option>/<optgroup> HTML for a GPU or Model <select>, for use in
// dynamically-created comparison-mode slot dropdowns.
function buildGPUOptionsHTML(selected) {
  const opt = (k) => `<option value="${esc(k)}"${k===selected?' selected':''}>${esc(k)}</option>`;
  let html = Object.keys(GPU_SPECS).map(opt).join('');
  const customKeys = Object.keys(customGPUs);
  if (customKeys.length) html = customKeys.map(opt).join('') + html;
  return html;
}
function buildModelOptionsHTML(selected) {
  const opt = (k) => `<option value="${esc(k)}"${k===selected?' selected':''}>${esc(k)}</option>`;
  let html = Object.keys(MODEL_SPECS).filter(k => k !== 'Custom').map(opt).join('');
  const customKeys = Object.keys(customModels);
  if (customKeys.length) html = customKeys.map(opt).join('') + html;
  return html;
}
