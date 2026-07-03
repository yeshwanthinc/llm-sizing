// ══════════════════════════════════════════════
// FORMULAS / ASSUMPTIONS / GLOSSARY DOCS
// ══════════════════════════════════════════════
function buildDocs() {
  return `<div class="docs-grid">
  <div class="dg2">
    <h4>Core Formulas</h4>
    <p><b>Model Weight Memory</b></p>
    <div class="formula-box">model_mem_GB = params_B × bytes_per_weight
<span class="cm">(e.g. 70B × 2 B/param = 140 GB for FP16)</span></div>
    <h4>KV Cache Memory</h4>
    <div class="formula-box">kv_bytes_per_pos = 2 × layers × kv_heads × head_dim × kv_bytes
kv_GB_per_req   = kv_bytes_per_pos × (in_toks + out_toks) / 1e9
total_kv_GB     = concurrent_reqs × kv_GB_per_req</div>
    <h4>Concurrent Requests (Little's Law)</h4>
    <div class="formula-box">concurrent = RPS × E2E_latency × concurrency_factor</div>
    <h4>Prefill Throughput (Compute-Bound)</h4>
    <div class="formula-box">max_prefill_TPS = GPUs × FP16_TFLOPS × MFU × 1e12
                 / (2 × active_params × 1e9)
max_RPS_prefill = max_prefill_TPS / input_tokens</div>
    <h4>Decode Throughput (BW-Bound at Small Batch)</h4>
    <div class="formula-box">single_decode_TPS = total_BW_GBps × 1e9
                     / (active_params_B × bytes_per_param × 1e9)
crossover_batch  = compute_bound_TPS / single_decode_TPS</div>
    <h4>Latency</h4>
    <div class="formula-box">TTFT = input_tokens / max_prefill_TPS
TBT  = 1 / single_decode_TPS
E2E  = TTFT + output_tokens × TBT</div>
    <h4>Spare Capacity</h4>
    <div class="formula-box">max_RPS = min(maxRPS_mem, maxRPS_prefill, maxRPS_decode)
spare % = (1 − RPS / max_RPS) × 100</div>
  </div>
  <div class="dg2">
    <h4>Key Assumptions</h4>
    <ul>
      <li>MFU (default 40%) is typical for well-tuned inference. Range: 30–55%.</li>
      <li>All GPUs serve one model via tensor parallelism (TP = num_gpus).</li>
      <li>Decode is memory-bandwidth bound at batch sizes below the crossover point.</li>
      <li>KV cache is FP16 by default; FP8 KV reduces it ~2× with minimal quality loss.</li>
      <li>MoE: total params used for memory; active params for compute &amp; bandwidth.</li>
      <li>GPU specs are manufacturer peak ratings; real-world bandwidth ≈ 85–95% of rated.</li>
      <li>Prefill and decode are not pipelined; continuous batching (vLLM) improves this.</li>
    </ul>
    <h4>Glossary</h4>
    <ul>
      <li><b>RPS</b> — Requests per second (throughput target)</li>
      <li><b>TTFT</b> — Time to First Token (prefill latency)</li>
      <li><b>TBT</b> — Time Between Tokens (decode step time)</li>
      <li><b>MFU</b> — Model Flops Utilization (fraction of peak TFLOPS used)</li>
      <li><b>KV cache</b> — Key/Value activations stored per token for attention</li>
      <li><b>GQA</b> — Grouped Query Attention (fewer KV heads → smaller KV cache)</li>
      <li><b>MoE</b> — Mixture of Experts (sparse; only some params active per token)</li>
      <li><b>TP</b> — Tensor Parallelism (model split across N GPUs)</li>
      <li><b>Crossover batch</b> — Batch size where decode shifts from BW-bound to compute-bound</li>
    </ul>
    <h4>Precision Reference</h4>
    <ul>
      <li><code>FP32</code> 4 B — training, highest quality, rarely used for inference</li>
      <li><code>FP16/BF16</code> 2 B — standard inference, no measurable quality loss</li>
      <li><code>FP8</code> 1 B — H100/H200/B200/L40S native; minimal quality loss</li>
      <li><code>INT8</code> 1 B — SmoothQuant; slight quality drop on some models</li>
      <li><code>INT4/GPTQ/AWQ/NF4</code> 0.5 B — 4× compression; moderate quality loss</li>
    </ul>
    <h4>Further Reading</h4>
    <ul>
      <li><a href="https://arxiv.org/abs/2309.06180" target="_blank" rel="noopener" style="color:var(--accent)">Efficient Memory Management for LLM Serving (PagedAttention)</a></li>
      <li><a href="https://arxiv.org/abs/2211.05102" target="_blank" rel="noopener" style="color:var(--accent)">FlashAttention: Fast and Memory-Efficient Attention</a></li>
      <li><a href="https://docs.vllm.ai" target="_blank" rel="noopener" style="color:var(--accent)">vLLM Documentation</a></li>
      <li><a href="https://huggingface.co/docs/text-generation-inference" target="_blank" rel="noopener" style="color:var(--accent)">Hugging Face TGI Documentation</a></li>
      <li><a href="https://en.wikipedia.org/wiki/Little%27s_law" target="_blank" rel="noopener" style="color:var(--accent)">Little's Law (Wikipedia)</a></li>
    </ul>
  </div>
  </div>`;
}

function toggleDocs(el) {
  const body = g('docs-body');
  const arr  = el.querySelector('.arr');
  body.classList.toggle('open');
  arr.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
}
