// ══════════════════════════════════════════════
// WORKLOAD PRESETS
// ══════════════════════════════════════════════
const WORKLOAD_PRESETS = {
  chat:    { rps:10, inTok:512,  outTok:256,  cachedTok:200,  cacheHitRate:60 },
  rag:     { rps:5,  inTok:4096, outTok:512,  cachedTok:800,  cacheHitRate:40 },
  agentic: { rps:2,  inTok:6000, outTok:2048, cachedTok:1500, cacheHitRate:70 },
};

function applyWorkloadPreset() {
  const key = g('workload-preset').value;
  const p = WORKLOAD_PRESETS[key];
  if (!p) return;
  g('rps').value           = p.rps;
  g('input-tokens').value  = p.inTok;
  g('output-tokens').value = p.outTok;
  g('cached-tokens').value = p.cachedTok;
  g('cache-hit-rate').value= p.cacheHitRate;
}
