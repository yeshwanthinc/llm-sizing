// ══════════════════════════════════════════════
// CORE CALCULATION
// ══════════════════════════════════════════════
function calculate() {
  const rps         = getNum('rps');
  const inTok       = getNum('input-tokens');
  const outTok      = getNum('output-tokens');
  const mfuPct      = getNum('mfu') / 100;
  const overheadPct = getNum('overhead') / 100;
  const concFactor  = getNum('conc-factor');
  const costPerGPUHr= getNum('cost-per-gpu-hr');
  const numGPUs     = getNum('num-gpus');
  const gpuKey      = g('gpu').value;
  const modelKey    = g('model').value;
  const prec        = g('precision').value;
  const kvPrec      = g('kv-precision').value;

  const gpu = GPU_SPECS[gpuKey] || customGPUs[gpuKey];
  let m     = MODEL_SPECS[modelKey] || customModels[modelKey];

  if (modelKey === 'Custom') {
    const ap = getNum('c-active') || getNum('c-params');
    m = { p:getNum('c-params'), L:getNum('c-layers'), kv:getNum('c-kv-heads'),
          h:getNum('c-heads'), hd:getNum('c-head-dim'), ap, moe: ap < getNum('c-params') };
  }

  if (!gpu || !m || !m.p) { alert('Please select a valid GPU and model.'); return; }

  const params_B  = m.p;
  const activeP_B = m.moe ? (m.ap || params_B) : params_B;
  const layers    = m.L;
  const kvHeads   = m.kv;
  const headDim   = m.hd;
  const wBytes    = PRECISION_BYTES[prec];
  const kvBytes   = PRECISION_BYTES[kvPrec];

  // GPU totals
  const totalMemGB  = numGPUs * gpu[0];
  const totalBWGBps = numGPUs * gpu[1];
  const totalTFLOPS = numGPUs * gpu[2];
  const gpuTDP      = gpu[4];

  // Memory breakdown
  const modelMemGB   = params_B * wBytes;
  const fwOverheadGB = totalMemGB * overheadPct;
  const usableMemGB  = totalMemGB - fwOverheadGB;
  const kvBytesPerPos= 2 * layers * kvHeads * headDim * kvBytes;
  const kvGBPerTok   = kvBytesPerPos / 1e9;
  const seqLen       = inTok + outTok;
  const kvGBPerReq   = kvGBPerTok * seqLen;
  const kvBudgetGB   = Math.max(0, usableMemGB - modelMemGB);

  // Throughput limits
  const activeBytesTotal    = activeP_B * 1e9 * wBytes;
  const singleDecodeRateTPS = (totalBWGBps * 1e9) / activeBytesTotal;
  const maxPrefillTPS       = (totalTFLOPS * mfuPct * 1e12) / (2 * activeP_B * 1e9);
  const maxDecodeTPSCompute = maxPrefillTPS;
  const crossoverBatch      = Math.max(1, Math.round(maxDecodeTPSCompute / singleDecodeRateTPS));

  // Latency
  const ttft       = inTok  / maxPrefillTPS;
  const tbt        = 1.0    / singleDecodeRateTPS;
  const e2eLatency = ttft + outTok * tbt;

  // Concurrency (Little's Law + safety factor)
  const concRequests = rps * e2eLatency * concFactor;

  // KV cache needed
  const requiredKVGB   = concRequests * kvGBPerReq;
  const totalReqMemGB  = modelMemGB + requiredKVGB + fwOverheadGB;

  // Effective decode TPS
  const effBatch        = Math.min(concRequests, crossoverBatch);
  const actualDecodeTPS = Math.min(effBatch * singleDecodeRateTPS, maxDecodeTPSCompute);

  // Required TPS
  const reqPrefillTPS = rps * inTok;
  const reqDecodeTPS  = rps * outTok;

  // Utilizations
  const memUtil     = totalReqMemGB / usableMemGB;
  const prefillUtil = reqPrefillTPS / maxPrefillTPS;
  const decodeUtil  = actualDecodeTPS > 0 ? reqDecodeTPS / actualDecodeTPS : 0;
  const bwUtil      = Math.min(1, concRequests / Math.max(1, crossoverBatch));

  // Max RPS per constraint
  const maxRPS_mem    = kvBudgetGB > 0 ? (kvBudgetGB / kvGBPerReq) / (e2eLatency * concFactor) : 0;
  const maxRPS_prefill= maxPrefillTPS / Math.max(1, inTok);
  const maxRPS_decode = maxDecodeTPSCompute / Math.max(1, outTok);
  const maxRPS        = Math.min(maxRPS_mem, maxRPS_prefill, maxRPS_decode);

  // Spare capacity
  const overallUtil  = rps / Math.max(0.001, maxRPS);
  const spareCapPct  = Math.max(0, (1 - overallUtil) * 100);
  const maxAddlRPS   = Math.max(0, maxRPS - rps);

  // Bottleneck
  const minMax = Math.min(maxRPS_mem, maxRPS_prefill, maxRPS_decode);
  let bottleneck = minMax === maxRPS_mem ? 'KV Cache Memory'
                 : minMax === maxRPS_prefill ? 'Prefill Compute' : 'Decode Compute';

  // Cost
  const costPerHr   = numGPUs * costPerGPUHr;
  const tokPerHr    = rps * (inTok + outTok) * 3600;
  const costPerMTok = tokPerHr > 0 ? (costPerHr / tokPerHr) * 1e6 : 0;
  const minGPUs_rec = Math.max(Math.ceil(numGPUs * memUtil), Math.ceil(numGPUs * prefillUtil), 1);

  renderDashboard({
    rps, inTok, outTok, numGPUs, params_B, activeP_B, layers, kvHeads, headDim,
    prec, kvPrec, mfuPct, gpuKey, modelKey, isMoE: m.moe||false,
    totalMemGB, usableMemGB, fwOverheadGB, modelMemGB, kvBudgetGB,
    kvGBPerTok, kvGBPerReq, requiredKVGB, totalReqMemGB,
    totalBWGBps, totalTFLOPS, singleDecodeRateTPS,
    maxPrefillTPS, maxDecodeTPSCompute, crossoverBatch, actualDecodeTPS,
    reqPrefillTPS, reqDecodeTPS,
    ttft, tbt, e2eLatency, concRequests,
    memUtil, prefillUtil, decodeUtil, bwUtil,
    maxRPS_mem, maxRPS_prefill, maxRPS_decode, maxRPS, maxAddlRPS,
    overallUtil, spareCapPct, bottleneck,
    costPerHr, costPerMTok, minGPUs_rec, gpu
  });
}
