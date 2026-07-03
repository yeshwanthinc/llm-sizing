// ══════════════════════════════════════════════
// CORE CALCULATION (pure — no DOM access)
// ══════════════════════════════════════════════
// cfg: { rps, inTok, outTok, mfuPct, overheadPct, concFactor, costPerGPUHr,
//        numGPUs, gpu:[mem,bw,fp16,fp8,tdp,interconnect], m:{p,L,kv,h,hd,ap,moe},
//        prec, kvPrec, gpuKey, modelKey,
//        gpusPerNode, cachedTok, cacheHitRate,
//        spotEnabled, spotCostPerGPUHr, loraEnabled, loraRank, loraAdapters }
let lastResult = null;

function computeMetrics(cfg) {
  const {
    rps, inTok, outTok, mfuPct, overheadPct, concFactor, costPerGPUHr,
    numGPUs, gpu, m, prec, kvPrec,
    gpusPerNode = 8, cachedTok = 0, cacheHitRate = 0,
    spotEnabled = false, spotCostPerGPUHr = 0,
    loraEnabled = false, loraRank = 0, loraAdapters = 0,
  } = cfg;

  const params_B  = m.p;
  const activeP_B = m.moe ? (m.ap || params_B) : params_B;
  const layers    = m.L;
  const kvHeads   = m.kv;
  const headDim   = m.hd;
  const attnHeads = m.h || kvHeads;
  const wBytes    = PRECISION_BYTES[prec];
  const kvBytes   = PRECISION_BYTES[kvPrec];

  // Pipeline parallelism across nodes (TP within a node, PP across nodes)
  const nodeCount = Math.max(1, Math.ceil(numGPUs / Math.max(1, gpusPerNode)));
  const interconnect = gpu[5] || '';
  const interconnectPenalty = nodeCount <= 1 ? 1 : interconnectMFUPenalty(interconnect);
  const effMfuPct = mfuPct * interconnectPenalty;

  // GPU totals
  const totalMemGB  = numGPUs * gpu[0];
  const totalBWGBps = numGPUs * gpu[1];
  const totalTFLOPS = numGPUs * gpu[2];

  // Memory breakdown
  const modelMemGB   = params_B * wBytes;
  const fwOverheadGB = totalMemGB * overheadPct;

  // LoRA adapter memory (assumes target matrices on q/k/v/o + mlp up/down)
  const hiddenSize = attnHeads * headDim;
  const loraParamsPerAdapter = loraEnabled ? 2 * loraRank * hiddenSize * LORA_TARGET_MATRICES * layers : 0;
  const loraMemGB = loraEnabled ? (loraParamsPerAdapter * loraAdapters * wBytes) / 1e9 : 0;

  const usableMemGB  = totalMemGB - fwOverheadGB;
  const kvBytesPerPos= 2 * layers * kvHeads * headDim * kvBytes;
  const kvGBPerTok   = kvBytesPerPos / 1e9;
  const seqLen       = inTok + outTok;

  // Prefix / system-prompt caching: a shared prefix is stored once and
  // reused (vLLM automatic prefix caching / radix-tree sharing) rather than
  // duplicated per request, proportional to how often requests hit it.
  const cachedTokC       = Math.max(0, Math.min(cachedTok, inTok));
  const dedupedCachedTok = cachedTokC * cacheHitRate;
  const kvGBPerReq       = kvGBPerTok * Math.max(0, seqLen - dedupedCachedTok);
  const sharedPrefixKVGB = kvGBPerTok * dedupedCachedTok;
  const kvBudgetGB       = Math.max(0, usableMemGB - modelMemGB - loraMemGB);
  const effectivePrefillTok = Math.max(1, inTok - dedupedCachedTok);

  // Throughput limits
  const activeBytesTotal    = activeP_B * 1e9 * wBytes;
  const singleDecodeRateTPS = (totalBWGBps * 1e9) / activeBytesTotal;
  const maxPrefillTPS       = (totalTFLOPS * effMfuPct * 1e12) / (2 * activeP_B * 1e9);
  const maxDecodeTPSCompute = maxPrefillTPS;
  const crossoverBatch      = Math.max(1, Math.round(maxDecodeTPSCompute / singleDecodeRateTPS));

  // Latency
  const ttft       = effectivePrefillTok / maxPrefillTPS;
  const tbt        = 1.0 / singleDecodeRateTPS;
  const e2eLatency = ttft + outTok * tbt;

  // Concurrency (Little's Law + safety factor)
  const concRequests = rps * e2eLatency * concFactor;

  // KV cache needed
  const requiredKVGB  = concRequests * kvGBPerReq + sharedPrefixKVGB;
  const totalReqMemGB = modelMemGB + requiredKVGB + fwOverheadGB + loraMemGB;

  // Effective decode TPS
  const effBatch        = Math.min(concRequests, crossoverBatch);
  const actualDecodeTPS = Math.min(effBatch * singleDecodeRateTPS, maxDecodeTPSCompute);

  // Required TPS
  const reqPrefillTPS = rps * effectivePrefillTok;
  const reqDecodeTPS  = rps * outTok;

  // Utilizations
  const memUtil     = totalReqMemGB / usableMemGB;
  const prefillUtil = reqPrefillTPS / maxPrefillTPS;
  const decodeUtil  = actualDecodeTPS > 0 ? reqDecodeTPS / actualDecodeTPS : 0;
  const bwUtil      = Math.min(1, concRequests / Math.max(1, crossoverBatch));

  // Max RPS per constraint
  const kvBudgetAfterShared = Math.max(0, kvBudgetGB - sharedPrefixKVGB);
  const maxRPS_mem    = kvGBPerReq > 0 ? (kvBudgetAfterShared / kvGBPerReq) / (e2eLatency * concFactor) : 0;
  const maxRPS_prefill= maxPrefillTPS / Math.max(1, effectivePrefillTok);
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
  const effectiveCostPerGPUHr = spotEnabled ? spotCostPerGPUHr : costPerGPUHr;
  const costPerHr   = numGPUs * effectiveCostPerGPUHr;
  const tokPerHr    = rps * (inTok + outTok) * 3600;
  const costPerMTok = tokPerHr > 0 ? (costPerHr / tokPerHr) * 1e6 : 0;
  const minGPUs_rec = Math.max(Math.ceil(numGPUs * memUtil), Math.ceil(numGPUs * prefillUtil), 1);

  return {
    rps, inTok, outTok, numGPUs, params_B, activeP_B, layers, kvHeads, headDim,
    prec, kvPrec, mfuPct, effMfuPct, gpuKey: cfg.gpuKey, modelKey: cfg.modelKey, isMoE: m.moe||false,
    nodeCount, gpusPerNode, interconnect, interconnectPenalty,
    totalMemGB, usableMemGB, fwOverheadGB, modelMemGB, kvBudgetGB,
    kvGBPerTok, kvGBPerReq, requiredKVGB, totalReqMemGB, sharedPrefixKVGB,
    cachedTok: cachedTokC, cacheHitRate, effectivePrefillTok,
    loraEnabled, loraMemGB, loraRank, loraAdapters,
    totalBWGBps, totalTFLOPS, singleDecodeRateTPS,
    maxPrefillTPS, maxDecodeTPSCompute, crossoverBatch, actualDecodeTPS,
    reqPrefillTPS, reqDecodeTPS,
    ttft, tbt, e2eLatency, concRequests,
    memUtil, prefillUtil, decodeUtil, bwUtil,
    maxRPS_mem, maxRPS_prefill, maxRPS_decode, maxRPS, maxAddlRPS,
    overallUtil, spareCapPct, bottleneck,
    spotEnabled, costPerGPUHr, spotCostPerGPUHr, effectiveCostPerGPUHr,
    costPerHr, costPerMTok, minGPUs_rec, gpu
  };
}

// ══════════════════════════════════════════════
// DOM WRAPPER
// ══════════════════════════════════════════════
// Reads the sidebar form into a cfg object. `overrides` lets comparison-mode
// slots substitute their own gpu/model/precision/GPU-count while still
// sharing the common workload/advanced settings.
function readMainConfig(overrides) {
  overrides = overrides || {};
  const rps         = getNum('rps');
  const inTok       = getNum('input-tokens');
  const outTok      = getNum('output-tokens');
  const mfuPct      = getNum('mfu') / 100;
  const overheadPct = getNum('overhead') / 100;
  const concFactor  = getNum('conc-factor');
  const costPerGPUHr= getNum('cost-per-gpu-hr');
  const gpusPerNode = getNum('gpus-per-node') || 8;
  const cachedTok   = getNum('cached-tokens');
  const cacheHitRate= getNum('cache-hit-rate') / 100;
  const spotEnabled = g('spot-enabled') ? g('spot-enabled').checked : false;
  const spotCostPerGPUHr = getNum('spot-cost-per-gpu-hr');
  const loraEnabled = g('lora-enabled') ? g('lora-enabled').checked : false;
  const loraRank    = getNum('lora-rank');
  const loraAdapters= getNum('lora-adapters');

  const numGPUs     = overrides.numGPUs  ?? getNum('num-gpus');
  const gpuKey      = overrides.gpuKey   ?? g('gpu').value;
  const modelKey    = overrides.modelKey ?? g('model').value;
  const prec        = overrides.prec     ?? g('precision').value;
  const kvPrec      = overrides.kvPrec   ?? g('kv-precision').value;

  const gpu = GPU_SPECS[gpuKey] || customGPUs[gpuKey];
  let m     = MODEL_SPECS[modelKey] || customModels[modelKey];

  if (modelKey === 'Custom') {
    const ap = getNum('c-active') || getNum('c-params');
    m = { p:getNum('c-params'), L:getNum('c-layers'), kv:getNum('c-kv-heads'),
          h:getNum('c-heads'), hd:getNum('c-head-dim'), ap, moe: ap < getNum('c-params') };
  }

  return {
    rps, inTok, outTok, mfuPct, overheadPct, concFactor, costPerGPUHr,
    numGPUs, gpu, m, prec, kvPrec, gpuKey, modelKey,
    gpusPerNode, cachedTok, cacheHitRate,
    spotEnabled, spotCostPerGPUHr, loraEnabled, loraRank, loraAdapters,
  };
}

function calculate() {
  const cfg = readMainConfig();
  if (!cfg.gpu || !cfg.m || !cfg.m.p) { alert('Please select a valid GPU and model.'); return; }

  const r = computeMetrics(cfg);
  lastResult = r;
  renderDashboard(r);
  if (typeof renderSweepChart === 'function') renderSweepChart(cfg);
  if (typeof updateURLFromState === 'function') updateURLFromState();
}
