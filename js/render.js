// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════
let memChart = null;

function renderDashboard(r) {
  const sp    = r.spareCapPct;
  const spCls = spareClass(sp);

  g('main-area').innerHTML = `
  <div class="cards">
    <div class="card">
      <div class="card-label">Spare Capacity <span class="tip" data-tip-id="spare-cap">?</span></div>
      <div class="card-value ${spCls}">${sp.toFixed(1)}%</div>
      <div class="card-sub">Max RPS: <b>${fmtK(r.maxRPS)}</b> · Current: <b>${fmtK(r.rps)}</b><br>+${fmtK(r.maxAddlRPS)} req/s headroom</div>
      <div class="card-bar"><div class="card-bar-fill" style="width:${Math.min(100,(1-sp/100)*100)}%;background:${sp>=30?'var(--green)':sp>=10?'var(--yellow)':'var(--red)'}"></div></div>
    </div>
    <div class="card">
      <div class="card-label">Memory Utilization <span class="tip" data-tip-id="mem-util">?</span></div>
      <div class="card-value" style="color:${statusColor(r.memUtil)}">${pct(r.memUtil)}</div>
      <div class="card-sub">${fmtGB(r.totalReqMemGB)} / ${fmtGB(r.usableMemGB)} usable<br>KV Budget: ${fmtGB(r.kvBudgetGB)}</div>
      <div class="card-bar"><div class="card-bar-fill" style="width:${Math.min(100,r.memUtil*100)}%;background:${statusColor(r.memUtil)}"></div></div>
    </div>
    <div class="card">
      <div class="card-label">Prefill Compute Util <span class="tip" data-tip-id="prefill-util">?</span></div>
      <div class="card-value" style="color:${statusColor(r.prefillUtil)}">${pct(r.prefillUtil)}</div>
      <div class="card-sub">${fmtTPS(r.reqPrefillTPS)} needed<br>Max: ${fmtTPS(r.maxPrefillTPS)}</div>
      <div class="card-bar"><div class="card-bar-fill" style="width:${Math.min(100,r.prefillUtil*100)}%;background:${statusColor(r.prefillUtil)}"></div></div>
    </div>
    <div class="card">
      <div class="card-label">Decode Throughput Util <span class="tip" data-tip-id="decode-util">?</span></div>
      <div class="card-value" style="color:${statusColor(r.decodeUtil)}">${pct(r.decodeUtil)}</div>
      <div class="card-sub">${fmtTPS(r.reqDecodeTPS)} needed<br>Eff. Max: ${fmtTPS(r.actualDecodeTPS)}</div>
      <div class="card-bar"><div class="card-bar-fill" style="width:${Math.min(100,r.decodeUtil*100)}%;background:${statusColor(r.decodeUtil)}"></div></div>
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-title">📦 GPU Memory Breakdown <span class="tip" data-tip-id="mem-chart">?</span>
        <span style="font-size:11px;color:var(--t2);font-weight:400">${r.numGPUs}× ${r.gpu[0]}GB = ${fmtGB(r.totalMemGB)} total</span>
      </div>
      <div class="ch-wrap"><canvas id="mem-chart"></canvas></div>
      <div class="legend" id="mem-legend"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📈 Resource Utilization</div>
      <div class="util-list" id="util-list"></div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="font-size:11px;color:var(--t2);margin-bottom:8px">Max RPS by constraint <span class="tip" data-tip-id="max-rps-chart">?</span></div>
        <div class="util-list" id="max-rps-list"></div>
      </div>
    </div>
  </div>

  <div class="details-card">
    <div class="details-title">📋 Detailed Metrics</div>
    <div class="details-grid">
      <div class="dg">
        <h4>Latency Estimates</h4>
        <div class="dr"><span class="k">Time to First Token (TTFT) <span class="tip" data-tip-id="ttft">?</span></span><span class="v">${fmtMs(r.ttft)}</span></div>
        <div class="dr"><span class="k">Time Between Tokens (TBT) <span class="tip" data-tip-id="tbt">?</span></span><span class="v">${fmtMs(r.tbt)}</span></div>
        <div class="dr"><span class="k">End-to-End Latency <span class="tip" data-tip-id="e2e-latency">?</span></span><span class="v">${fmtMs(r.e2eLatency)}</span></div>
        <div class="dr"><span class="k">Concurrent Requests <span class="tip" data-tip-id="concurrent-reqs">?</span></span><span class="v">${r.concRequests.toFixed(1)}</span></div>
        <div class="dr"><span class="k">Crossover Batch Size <span class="tip" data-tip-id="crossover-batch">?</span></span><span class="v">${r.crossoverBatch} req</span></div>
      </div>
      <div class="dg">
        <h4>KV Cache Analysis</h4>
        <div class="dr"><span class="k">KV per token <span class="tip" data-tip-id="kv-per-tok">?</span></span><span class="v">${fmtKV(r.kvGBPerTok)}</span></div>
        <div class="dr"><span class="k">KV per request (${r.inTok+r.outTok} tok) <span class="tip" data-tip-id="kv-per-req">?</span></span><span class="v">${fmtGB(r.kvGBPerReq)}</span></div>
        <div class="dr"><span class="k">Total KV cache used <span class="tip" data-tip-id="total-kv">?</span></span><span class="v">${fmtGB(r.requiredKVGB)}</span></div>
        <div class="dr"><span class="k">KV cache budget <span class="tip" data-tip-id="kv-budget">?</span></span><span class="v">${fmtGB(r.kvBudgetGB)}</span></div>
        <div class="dr"><span class="k">Max concurrent (mem) <span class="tip" data-tip-id="max-concurrent-mem">?</span></span><span class="v">${r.kvBudgetGB>0?Math.floor(r.kvBudgetGB/r.kvGBPerReq):0} req</span></div>
      </div>
      <div class="dg">
        <h4>Throughput &amp; Bandwidth</h4>
        <div class="dr"><span class="k">Total GPU bandwidth <span class="tip" data-tip-id="total-bw">?</span></span><span class="v">${r.totalBWGBps.toFixed(0)} GB/s</span></div>
        <div class="dr"><span class="k">Single-req decode rate <span class="tip" data-tip-id="single-decode-rate">?</span></span><span class="v">${fmtTPS(r.singleDecodeRateTPS)}</span></div>
        <div class="dr"><span class="k">Effective decode TPS <span class="tip" data-tip-id="eff-decode-tps">?</span></span><span class="v">${fmtTPS(r.actualDecodeTPS)}</span></div>
        <div class="dr"><span class="k">Max prefill TPS <span class="tip" data-tip-id="max-prefill-tps">?</span></span><span class="v">${fmtTPS(r.maxPrefillTPS)}</span></div>
        <div class="dr"><span class="k">Cluster eff. TFLOPS <span class="tip" data-tip-id="eff-tflops">?</span></span><span class="v">${(r.totalTFLOPS*r.mfuPct).toFixed(0)} TF</span></div>
      </div>
      <div class="dg">
        <h4>Power &amp; Cost</h4>
        <div class="dr"><span class="k">Total GPU TDP <span class="tip" data-tip-id="total-tdp">?</span></span><span class="v">${(r.numGPUs*r.gpu[4]).toFixed(0)} W</span></div>
        <div class="dr"><span class="k">Cost per hour <span class="tip" data-tip-id="cost-per-hr">?</span></span><span class="v">$${r.costPerHr.toFixed(2)}/hr</span></div>
        <div class="dr"><span class="k">Cost per 1M tokens <span class="tip" data-tip-id="cost-per-mtok">?</span></span><span class="v">$${r.costPerMTok.toFixed(2)}</span></div>
        <div class="dr"><span class="k">Min GPUs recommended <span class="tip" data-tip-id="min-gpus">?</span></span><span class="v">${r.minGPUs_rec} GPU${r.minGPUs_rec>1?'s':''}</span></div>
        <div class="dr"><span class="k">Output Mtok/hr <span class="tip" data-tip-id="output-mtok">?</span></span><span class="v">${(r.rps*r.outTok*3600/1e6).toFixed(1)}M</span></div>
      </div>
    </div>
  </div>

  <div class="reco-card">
    <div class="reco-hdr">
      <h3>💡 Analysis &amp; Recommendations</h3>
      <span class="bn-badge ${r.bottleneck==='KV Cache Memory'?'bn-mem':r.bottleneck==='Prefill Compute'?'bn-pre':'bn-dec'}">
        Bottleneck: ${r.bottleneck} <span class="tip" data-tip-id="bottleneck-badge" style="border-color:currentColor;background:transparent;color:inherit">?</span>
      </span>
    </div>
    <div class="reco-list" id="reco-list"></div>
  </div>

  <div class="docs-wrap">
    <div class="docs-toggle" onclick="toggleDocs(this)">
      📖 Formulas, Assumptions &amp; Glossary
      <span class="arr">▼</span>
    </div>
    <div class="docs-body" id="docs-body">${buildDocs()}</div>
  </div>`;

  renderMemChart(r);
  renderUtilBars(r);
  renderRecos(r);
  initTooltips();
}

function renderMemChart(r) {
  if (memChart) { memChart.destroy(); memChart = null; }
  const free = Math.max(0, r.usableMemGB - r.modelMemGB - r.requiredKVGB);
  const colors = ['#58a6ff','#bc8cff','#3fb950','#6e7681'];
  const labels = ['Model Weights','KV Cache','Free (usable)','Framework OH'];
  const data   = [r.modelMemGB, r.requiredKVGB, free, r.fwOverheadGB];
  g('mem-legend').innerHTML = labels.map((l,i) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div>${l}: ${fmtGB(data[i])}</div>`
  ).join('') + (r.totalReqMemGB > r.usableMemGB
    ? `<div class="legend-item"><div class="legend-dot" style="background:var(--red)"></div>Over capacity: ${fmtGB(r.totalReqMemGB - r.usableMemGB)}</div>`
    : '');
  memChart = new Chart(g('mem-chart').getContext('2d'), {
    type:'bar',
    data:{ labels:['GPU Memory'],
      datasets: labels.map((l,i) => ({ label:l, data:[data[i]], backgroundColor:colors[i] }))
    },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>` ${c.dataset.label}: ${fmtGB(c.raw)}` }}},
      scales:{
        x:{ stacked:true, max:r.totalMemGB, grid:{color:'rgba(48,54,61,.5)'}, ticks:{color:'#8b949e', callback:v=>fmtGB(v)} },
        y:{ stacked:true, grid:{display:false}, ticks:{color:'#8b949e'} }
      }
    }
  });
}

function renderUtilBars(r) {
  const bars = [
    { name:'Memory Utilization',     val:r.memUtil,     info:'Usable: '+fmtGB(r.usableMemGB),           tip:'mem-util-bar' },
    { name:'Prefill Compute Util',   val:r.prefillUtil, info:'Max: '+fmtTPS(r.maxPrefillTPS),           tip:'prefill-util-bar' },
    { name:'Decode Throughput Util', val:r.decodeUtil,  info:'Eff. Max: '+fmtTPS(r.actualDecodeTPS),    tip:'decode-util-bar' },
    { name:'BW Saturation (decode)', val:r.bwUtil,      info:'Crossover: '+r.crossoverBatch+' req',     tip:'bw-util-bar' },
  ];
  g('util-list').innerHTML = bars.map(b => {
    const col = statusColor(b.val);
    return `<div class="util-row">
      <div class="util-hdr"><span class="util-name">${b.name} <span class="tip" data-tip-id="${b.tip}">?</span></span><span class="util-pct" style="color:${col}">${pct(b.val)}</span></div>
      <div class="util-bar"><div class="util-fill" style="width:${Math.min(100,b.val*100)}%;background:${col}"></div></div>
      <div class="util-max">${b.info}</div>
    </div>`;
  }).join('');

  const rpsItems = [
    { name:'Memory (KV cache)',  val:r.maxRPS_mem,     bn:r.bottleneck==='KV Cache Memory' },
    { name:'Prefill compute',    val:r.maxRPS_prefill,  bn:r.bottleneck==='Prefill Compute' },
    { name:'Decode compute',     val:r.maxRPS_decode,   bn:r.bottleneck==='Decode Compute'  },
  ];
  g('max-rps-list').innerHTML = rpsItems.map(b => {
    const col = b.bn ? 'var(--red)' : 'var(--accent)';
    const pctNum = Math.min(100, (r.rps/b.val)*100);
    return `<div class="util-row">
      <div class="util-hdr"><span class="util-name">${b.name}${b.bn?' ⚠️':''}</span><span class="util-pct" style="color:${col}">${fmtK(b.val)} RPS max</span></div>
      <div class="util-bar"><div class="util-fill" style="width:${pctNum}%;background:${col}"></div></div>
    </div>`;
  }).join('');
}

function renderRecos(r) {
  const sp = r.spareCapPct;
  const items = [];
  if      (sp >= 50) items.push({cls:'rg',icon:'✅',txt:`Healthy headroom: ${sp.toFixed(0)}% spare capacity. You can absorb ${fmtK(r.maxAddlRPS)} more req/s before hitting a resource limit.`});
  else if (sp >= 20) items.push({cls:'ri',icon:'ℹ️',txt:`Moderate headroom: ${sp.toFixed(0)}% spare. Consider keeping ≥20% as a production safety buffer for traffic spikes.`});
  else if (sp >=  5) items.push({cls:'rw',icon:'⚠️',txt:`Low headroom: ${sp.toFixed(0)}% spare. Near saturation — scale before load increases further.`});
  else               items.push({cls:'rc',icon:'🚨',txt:`Overloaded! ${sp<=0?'Current load exceeds capacity.':'Only '+sp.toFixed(1)+'% headroom.'}  Add GPUs or reduce load immediately.`});

  if (r.memUtil > 0.90) items.push({cls:'rc',icon:'💾',txt:`KV cache memory at ${pct(r.memUtil)}. Options: (1) FP8 KV cache (halves KV memory), (2) INT4 weight quantization, (3) reduce max sequence length, (4) add GPUs.`});
  else if (r.memUtil > 0.75) items.push({cls:'rw',icon:'💾',txt:`Memory at ${pct(r.memUtil)}. FP8 KV cache would free ${fmtGB(r.requiredKVGB*0.5)} of KV budget headroom.`});

  if (r.prefillUtil > 0.85) items.push({cls:'rw',icon:'⚡',txt:`Prefill compute at ${pct(r.prefillUtil)}. Long prompts (${r.inTok} tokens) are a significant cost. Consider prefix caching, prompt compression, or chunked prefill.`});

  if (r.modelMemGB > r.totalMemGB * 0.98) items.push({cls:'rc',icon:'⛔',txt:`Model weights (${fmtGB(r.modelMemGB)}) nearly fill all GPU memory (${fmtGB(r.totalMemGB)}). Need at least ${Math.ceil(r.modelMemGB/r.gpu[0])} GPUs for this model. No room for KV cache.`});

  if (r.isMoE) items.push({cls:'ri',icon:'🔀',txt:`MoE model: ${r.params_B}B total params loaded into memory, but only ${r.activeP_B}B active per token for compute. Decode bandwidth scales with active params only.`});

  if ((r.prec==='fp16'||r.prec==='bf16') && (r.params_B*0.5 + r.requiredKVGB < r.usableMemGB*0.8)) {
    items.push({cls:'ri',icon:'🗜️',txt:`INT4 quantization would shrink model weights from ${fmtGB(r.modelMemGB)} → ${fmtGB(r.params_B*0.5)} (saves ${fmtGB(r.modelMemGB-r.params_B*0.5)}), freeing substantial KV cache budget.`});
  }

  if (r.crossoverBatch > r.concRequests * 2) items.push({cls:'ri',icon:'📡',txt:`Memory-bandwidth bound regime: concurrent ${r.concRequests.toFixed(1)} << crossover ${r.crossoverBatch}. Increasing batch size will linearly improve total decode throughput.`});

  items.push({cls:'ri',icon:'💰',txt:`Cost: $${r.costPerHr.toFixed(2)}/hr for ${r.numGPUs} GPU(s), ~$${r.costPerMTok.toFixed(2)}/1M output tokens at current RPS.`});

  g('reco-list').innerHTML = items.map(it =>
    `<div class="reco ${it.cls}"><span class="reco-icon">${it.icon}</span><span>${it.txt}</span></div>`
  ).join('');
}
