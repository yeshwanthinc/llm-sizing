// ══════════════════════════════════════════════
// CUSTOM GPU/MODEL STORAGE
// ══════════════════════════════════════════════
let customGPUs = {};
let customModels = {};

function loadCustomData() {
  try { customGPUs  = JSON.parse(localStorage.getItem('llm-custom-gpus')   || '{}'); } catch(e){}
  try { customModels= JSON.parse(localStorage.getItem('llm-custom-models') || '{}'); } catch(e){}
  rebuildCustomGPUOptions();
  rebuildCustomModelOptions();
}

function rebuildCustomGPUOptions() {
  const sel = g('gpu');
  const old = sel.querySelector('optgroup[data-custom]');
  if (old) sel.removeChild(old);
  const keys = Object.keys(customGPUs);
  if (!keys.length) return;
  const og = document.createElement('optgroup');
  og.label = '── My Custom GPUs ──';
  og.dataset.custom = '1';
  keys.forEach(k => { const o = new Option(k, k); og.appendChild(o); });
  sel.insertBefore(og, sel.firstChild);
}

function rebuildCustomModelOptions() {
  const sel = g('model');
  const old = sel.querySelector('optgroup[data-custom]');
  if (old) sel.removeChild(old);
  const keys = Object.keys(customModels);
  if (!keys.length) return;
  const og = document.createElement('optgroup');
  og.label = '── My Custom Models ──';
  og.dataset.custom = '1';
  keys.forEach(k => { const o = new Option(k, k); og.appendChild(o); });
  sel.insertBefore(og, sel.firstChild);
}

function saveCustomGPU() {
  const name = g('ag-name').value.trim();
  if (!name) { alert('Please enter a GPU name.'); return; }
  const mem  = parseFloat(g('ag-mem').value)  || 0;
  const bw   = parseFloat(g('ag-bw').value)   || 0;
  const fp16 = parseFloat(g('ag-fp16').value) || 0;
  const fp8  = parseFloat(g('ag-fp8').value)  || null;
  const tdp  = parseFloat(g('ag-tdp').value)  || 0;
  const ic   = g('ag-ic').value.trim() || 'Custom';
  if (!mem || !bw || !fp16) { alert('VRAM, Bandwidth, and FP16 TFLOPS are required.'); return; }
  customGPUs[name] = [mem, bw, fp16, fp8 || null, tdp, ic];
  localStorage.setItem('llm-custom-gpus', JSON.stringify(customGPUs));
  rebuildCustomGPUOptions();
  renderSavedGPUs();
  g('ag-name').value = '';
}

function deleteCustomGPU(name) {
  delete customGPUs[name];
  localStorage.setItem('llm-custom-gpus', JSON.stringify(customGPUs));
  rebuildCustomGPUOptions();
  renderSavedGPUs();
}

function saveCustomModel() {
  const name = g('am-name').value.trim();
  if (!name) { alert('Please enter a model name.'); return; }
  const p  = parseFloat(g('am-params').value)  || 0;
  const ap = parseFloat(g('am-active').value)  || p;
  const L  = parseInt(g('am-layers').value)    || 0;
  const kv = parseInt(g('am-kv').value)        || 0;
  const hd = parseInt(g('am-hd').value)        || 0;
  const h  = parseInt(g('am-heads').value)     || 0;
  const moe= g('am-moe').value === '1';
  if (!p || !L || !kv || !hd) { alert('Params, Layers, KV Heads, and Head Dim are required.'); return; }
  customModels[name] = { p, L, kv, h, hd, ap: moe ? ap : p, moe };
  localStorage.setItem('llm-custom-models', JSON.stringify(customModels));
  rebuildCustomModelOptions();
  renderSavedModels();
  g('am-name').value = '';
}

function deleteCustomModel(name) {
  delete customModels[name];
  localStorage.setItem('llm-custom-models', JSON.stringify(customModels));
  rebuildCustomModelOptions();
  renderSavedModels();
}

function renderSavedGPUs() {
  const el = g('saved-gpu-list');
  const keys = Object.keys(customGPUs);
  if (!keys.length) { el.innerHTML = '<div class="empty-saved">No custom GPUs saved yet.</div>'; return; }
  el.innerHTML = keys.map(k => {
    const s = customGPUs[k];
    return `<div class="saved-item">
      <div>
        <div class="saved-item-name">${esc(k)}</div>
        <div class="saved-item-meta">${s[0]}GB · ${s[1]} GB/s · ${s[2]} TFLOPS${s[3]?` · FP8:${s[3]}`:''}</div>
      </div>
      <button class="saved-item-del" onclick="deleteCustomGPU(${JSON.stringify(k)})">✕ Remove</button>
    </div>`;
  }).join('');
}

function renderSavedModels() {
  const el = g('saved-model-list');
  const keys = Object.keys(customModels);
  if (!keys.length) { el.innerHTML = '<div class="empty-saved">No custom models saved yet.</div>'; return; }
  el.innerHTML = keys.map(k => {
    const m = customModels[k];
    return `<div class="saved-item">
      <div>
        <div class="saved-item-name">${esc(k)}</div>
        <div class="saved-item-meta">${m.p}B params · ${m.L} layers · ${m.kv} KV heads · head_dim ${m.hd}${m.moe?' · MoE':''}</div>
      </div>
      <button class="saved-item-del" onclick="deleteCustomModel(${JSON.stringify(k)})">✕ Remove</button>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// MODAL LOGIC
// ══════════════════════════════════════════════
function openModal(type) {
  g('modal-overlay').classList.add('open');
  g('modal-gpu').classList.remove('open');
  g('modal-model').classList.remove('open');
  if (type === 'gpu') {
    g('modal-gpu').classList.add('open');
    renderSavedGPUs();
  } else {
    g('modal-model').classList.add('open');
    renderSavedModels();
  }
}
function closeModal() {
  g('modal-overlay').classList.remove('open');
  g('modal-gpu').classList.remove('open');
  g('modal-model').classList.remove('open');
}
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
