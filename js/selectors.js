// ══════════════════════════════════════════════
// GPU / MODEL CHANGE HANDLERS
// ══════════════════════════════════════════════
function onGPUChange() {
  const key = g('gpu').value;
  const spec = GPU_SPECS[key] || customGPUs[key];
  if (!spec) { g('gpu-info-box').innerHTML=''; return; }
  const fp8txt = spec[3] ? `<span>FP8 TFLOPS:</span><b>${spec[3]}</b>` : '';
  g('gpu-info-box').innerHTML = `
    <span>VRAM:</span><b>${spec[0]} GB</b>
    <span>Bandwidth:</span><b>${spec[1]} GB/s</b>
    <span>FP16 TFLOPS:</span><b>${spec[2]}</b>
    ${fp8txt}
    <span>TDP:</span><b>${spec[4]} W</b>
    <span>Interconnect:</span><b>${spec[5]}</b>`;
  initTooltips();
}

function onModelChange() {
  const key = g('model').value;
  const m = MODEL_SPECS[key] || customModels[key];
  const cf = g('custom-fields');
  const mb = g('model-info-box');
  if (key === 'Custom') { cf.style.display='flex'; mb.innerHTML=''; return; }
  cf.style.display = 'none';
  if (!m) { mb.innerHTML=''; return; }
  const moeTag = m.moe ? ` <b style="color:var(--orange)">[MoE · active ${m.ap}B]</b>` : '';
  mb.innerHTML = `
    <span>Params:</span><b>${m.p}B${moeTag}</b>
    <span>Layers:</span><b>${m.L}</b>
    <span>KV Heads:</span><b>${m.kv}</b>
    <span>Attn Heads:</span><b>${m.h}</b>
    <span>Head Dim:</span><b>${m.hd}</b>`;
}
