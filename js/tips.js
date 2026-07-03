// ══════════════════════════════════════════════
// TOOLTIP DATA
// ══════════════════════════════════════════════
const TIPS = {
  'rps': {
    title: 'Requests Per Second (RPS)',
    text: 'Steady-state throughput target. Use peak load (P99) rather than average for conservative sizing. One request = one complete prompt → response exchange.',
    range: 'Typical: 1–500 RPS. Use peak, not average.',
    links: [
      { t: "Little's Law (Wikipedia)", u: 'https://en.wikipedia.org/wiki/Little%27s_law' },
      { t: 'vLLM benchmarking guide', u: 'https://docs.vllm.ai/en/latest/performance/benchmarks.html' },
    ]
  },
  'input-tokens': {
    title: 'Input / Prompt Tokens',
    text: 'Average token count in the prompt: system message + conversation history + user turn. Drives prefill compute cost and initial KV cache size. Longer prompts increase TTFT.',
    range: 'Chat: 128–1024 · RAG: 1k–8k · CoT: 2k–16k',
    links: [
      { t: 'OpenAI Tokenizer (interactive)', u: 'https://platform.openai.com/tokenizer' },
      { t: 'Hugging Face Tokenizer docs', u: 'https://huggingface.co/docs/transformers/tokenizer_summary' },
    ]
  },
  'output-tokens': {
    title: 'Output / Completion Tokens',
    text: 'Average tokens generated per response. Each token requires one autoregressive decode step reading all model weights — typically the memory-bandwidth bottleneck.',
    range: 'Chat: 64–512 · Coding: 256–2048 · Reasoning (CoT): 1k–8k+',
    links: [
      { t: 'How LLM generation works (HF blog)', u: 'https://huggingface.co/blog/how-to-generate' },
    ]
  },
  'model': {
    title: 'Model Architecture',
    text: 'Selecting a model auto-fills architecture parameters (layers, KV heads, head dimension) used to compute KV cache size. Architecture params come from the model\'s config.json.',
    links: [
      { t: 'Llama 3 model card (Meta / HF)', u: 'https://huggingface.co/meta-llama/Meta-Llama-3.1-8B' },
      { t: 'Open LLM Leaderboard', u: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard' },
      { t: 'Mistral models (HuggingFace)', u: 'https://huggingface.co/mistralai' },
    ]
  },
  'precision': {
    title: 'Weight Precision',
    text: 'Data type for storing model weights in GPU memory. Lower precision = less memory, potentially lower quality. FP16/BF16 is production standard with no quality loss. FP8 requires H100/H200/B200.',
    range: 'FP16 = 2× smaller than FP32 · INT4 = 8× smaller than FP32',
    links: [
      { t: 'GPTQ quantization paper', u: 'https://arxiv.org/abs/2210.17323' },
      { t: 'AWQ quantization paper', u: 'https://arxiv.org/abs/2306.00978' },
      { t: 'bitsandbytes (INT8/NF4)', u: 'https://github.com/TimDettmers/bitsandbytes' },
    ]
  },
  'kv-precision': {
    title: 'KV Cache Precision',
    text: 'Data type for Key/Value attention tensors cached in GPU memory. Set independently of weight precision. FP8 KV cache (supported in vLLM ≥0.5, TensorRT-LLM) halves KV memory use.',
    range: 'FP16: safest · FP8: saves 50% KV memory with minimal quality loss',
    links: [
      { t: 'FP8 KV cache paper (arXiv)', u: 'https://arxiv.org/abs/2404.09456' },
      { t: 'vLLM FP8 KV cache docs', u: 'https://docs.vllm.ai/en/latest/features/quantization/fp8_e5m2_kvcache.html' },
    ]
  },
  'gpu': {
    title: 'GPU Type',
    text: 'GPU hardware for your serving cluster. Specs are loaded from vendor datasheets. For inference, memory bandwidth is often the key metric — it determines single-request decode speed.',
    links: [
      { t: 'NVIDIA H100 datasheet', u: 'https://resources.nvidia.com/en-us-tensor-core/nvidia-tensor-core-gpu-datasheet' },
      { t: 'NVIDIA A100 datasheet', u: 'https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/a100/pdf/nvidia-a100-datasheet-us-nvidia-1758950-r4-web.pdf' },
      { t: 'AMD MI300X product page', u: 'https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html' },
    ]
  },
  'num-gpus': {
    title: 'Number of GPUs (Tensor Parallel)',
    text: 'GPUs per serving instance via tensor parallelism (TP). The model is sharded across all GPUs — each one holds 1/N of the weights. More GPUs = more total VRAM and bandwidth.',
    range: 'Single node: 1, 2, 4, 8 · Multi-node: 16, 32, 64+',
    links: [
      { t: 'Tensor parallelism (Megatron paper)', u: 'https://arxiv.org/abs/1909.08053' },
      { t: 'vLLM distributed serving', u: 'https://docs.vllm.ai/en/latest/serving/distributed_serving.html' },
    ]
  },
  'mfu': {
    title: 'Model FLOPs Utilization (MFU)',
    text: 'Fraction of peak TFLOPS actually used. Accounts for memory stalls, kernel launch overhead, GPU–GPU communication, and scheduling gaps. Higher is better.',
    range: 'Inference: 30–55% · Training: 40–65% · Small models/few GPUs: 20–35%',
    links: [
      { t: 'MFU metric introduced in PaLM paper', u: 'https://arxiv.org/abs/2204.02311' },
      { t: 'Achieving high GPU utilization (NVIDIA blog)', u: 'https://developer.nvidia.com/blog/maximizing-deep-learning-inference-performance-with-nvidia-model-analyzer/' },
    ]
  },
  'overhead': {
    title: 'Memory Overhead %',
    text: 'GPU memory reserved for CUDA runtime, PyTorch/JAX allocations, NCCL communication buffers, and activations. This memory is NOT available for model weights or KV cache.',
    range: 'vLLM: ~5–10% · TensorRT-LLM: ~5% · Naive PyTorch: ~15–20%',
    links: [
      { t: 'vLLM memory management docs', u: 'https://docs.vllm.ai/en/latest/design/kernel/paged_attention.html' },
    ]
  },
  'conc-factor': {
    title: 'Concurrency Safety Factor',
    text: "Multiplier on Little's Law estimate to buffer for burst traffic, request queuing, and continuous-batching warm-up. 1.0 = theoretical minimum concurrent requests.",
    range: '1.0 = ideal · 1.2 = recommended production · 1.5 = bursty/batch workloads',
    links: [
      { t: "Little's Law (Wikipedia)", u: 'https://en.wikipedia.org/wiki/Little%27s_law' },
    ]
  },
  'workload-preset': {
    title: 'Workload Preset',
    text: 'Pre-fills RPS, input/output tokens, and system-prompt caching assumptions for a common usage pattern. Still fully editable afterward — presets are a starting point, not a lock.',
  },
  'cached-tokens': {
    title: 'Cached / System Prompt Tokens',
    text: 'Tokens at the start of the prompt that are shared across requests (system message, few-shot examples, RAG instructions) and can be served from a prefix cache instead of recomputed and re-stored per request.',
    links: [ { t: 'Automatic prefix caching (vLLM)', u: 'https://docs.vllm.ai/en/latest/automatic_prefix_caching/apc.html' } ],
  },
  'cache-hit-rate': {
    title: 'Cache Hit Rate %',
    text: 'Fraction of requests that reuse the cached prefix rather than triggering a cold (full) computation of it. Higher hit rates reduce both prefill compute and duplicated KV cache storage for the shared portion.',
    range: 'Single shared system prompt: 60–90% · Per-user/session prompts: 20–50%',
  },
  'gpus-per-node': {
    title: 'GPUs per Node',
    text: 'How many GPUs share one physical node (and its intra-node interconnect, e.g. NVLink). When Number of GPUs exceeds this, the extra GPUs are modeled as additional nodes connected via pipeline parallelism, which incurs a communication penalty applied to effective MFU.',
    range: 'Typical single-node systems: 4 or 8 GPUs',
  },
  'spot-pricing': {
    title: 'Spot / Preemptible Pricing',
    text: 'Spot/preemptible instances cost substantially less than on-demand but can be reclaimed by the cloud provider with little notice — a real risk for stateful, long-running inference servers. When enabled, cost figures use the spot rate instead of the on-demand $/GPU-hr.',
    range: 'Typical spot discount: 60–80% off on-demand',
  },
  'lora': {
    title: 'LoRA Adapter Memory',
    text: 'Multi-tenant serving (e.g. S-LoRA, vLLM multi-LoRA) keeps several low-rank adapters resident in GPU memory alongside the base model. Estimated as 2×rank×hidden_size×6 target matrices×layers×adapters×bytes/param — a simplification since actual target_modules vary by adapter config.',
    links: [ { t: 'S-LoRA: serving thousands of LoRA adapters', u: 'https://arxiv.org/abs/2311.03285' } ],
  },
  'hf-import': {
    title: 'Import from Hugging Face',
    text: 'Fetches a model\'s config.json (by "org/model" id or a direct URL) and auto-fills layers, KV heads, attention heads, head dimension, and MoE detection. If the fetch is blocked by CORS, open the URL yourself and paste the JSON into the box below instead — that path always works.',
  },
  'sweep-chart': {
    title: 'Context-Length Sweep',
    text: 'Recomputes KV cache demand at context lengths from 1k to 128k tokens, holding output tokens and RPS fixed (concurrency re-derives naturally via Little\'s Law as latency grows with context). Shows where growing context length would exceed the KV cache budget — the "gotcha curve" that a single-point calculation hides.',
  },
  'prefix-cache': {
    title: 'Prefix Caching Effect',
    text: 'With a cache hit, the shared prefix is stored once and reused rather than duplicated per request, and only the non-cached remainder needs prefill compute — reducing both TTFT and KV memory pressure.',
  },
  'pp-nodes': {
    title: 'Pipeline Parallelism Across Nodes',
    text: 'When Number of GPUs exceeds GPUs per Node, the cluster is modeled as multiple nodes running pipeline parallelism (with tensor parallelism within each node). Cross-node communication is approximated as an MFU penalty keyed off the interconnect type — a simplification, since real inter-node fabric (e.g. InfiniBand) is a separate spec this tool doesn\'t collect.',
    links: [ { t: 'GPipe: pipeline parallelism', u: 'https://arxiv.org/abs/1811.06965' } ],
  },
  'cost-per-gpu-hr': {
    title: 'Cost per GPU-Hour ($)',
    text: 'On-demand or reserved hourly cost per single GPU. Used to estimate $/hr and cost per 1M tokens. Check your cloud provider\'s current pricing for accurate figures.',
    range: 'A10G: ~$0.8–1.5 · A100 80GB: ~$2–4 · H100: ~$3–6/hr',
    links: [
      { t: 'AWS EC2 GPU pricing', u: 'https://aws.amazon.com/ec2/pricing/on-demand/' },
      { t: 'Google Cloud GPU pricing', u: 'https://cloud.google.com/compute/gpus-pricing' },
      { t: 'Azure GPU VM pricing', u: 'https://azure.microsoft.com/pricing/details/machine-learning/' },
    ]
  },
  // Modal-only tips
  'tip-vram': { title: 'VRAM (GB)', text: 'Total GPU video memory in gigabytes. Find this in the GPU spec sheet or via nvidia-smi.' },
  'tip-bw': { title: 'Memory Bandwidth (GB/s)', text: 'Peak HBM bandwidth. This is the primary bottleneck for decode throughput at small batch sizes.' },
  'tip-fp16': { title: 'FP16 Peak TFLOPS', text: 'Tensor-core FP16 peak performance. Used to estimate prefill compute throughput.' },
  'tip-fp8': { title: 'FP8 TFLOPS (optional)', text: 'FP8 peak (typically 2× FP16). Available on H100, H200, B200, L40S, RTX 40xx. Leave blank if not supported.' },
  'tip-params': { title: 'Total Parameters (B)', text: 'Total parameter count in billions. For dense models this equals active params. For MoE, this includes all expert weights.' },
  'tip-active': { title: 'Active Parameters (B)', text: 'Parameters active per forward pass. Same as total for dense models. For MoE, this is the subset of experts activated per token (typically 10–30% of total).' },
  'tip-layers': { title: 'Number of Layers', text: 'Transformer block count (num_hidden_layers in config.json). Directly scales KV cache size.' },
  'tip-kv-heads': { title: 'KV Heads (num_key_value_heads)', text: 'Number of key/value attention heads per layer. With GQA (Llama, Mistral), this is fewer than total attention heads, reducing KV cache size.' },
  'tip-head-dim': { title: 'Head Dimension', text: 'Dimension of each attention head (hidden_size / num_attention_heads). Common values: 64, 128, 256.' },

  // ── Output / Results metric tips ──
  'spare-cap': {
    title: 'Spare Capacity',
    text: 'Percentage of additional load (RPS) this cluster can absorb before any resource saturates. Computed as (1 − current_RPS / max_RPS) × 100. The max_RPS is the minimum across all three constraints.',
    range: '≥30% = healthy prod buffer · 10–30% = monitor · <10% = near limit · 0% = overloaded',
    links: [
      { t: 'SRE workbook: capacity planning', u: 'https://sre.google/workbook/capacity-planning/' },
      { t: 'Production serving best practices (Anyscale)', u: 'https://www.anyscale.com/blog/llm-inference-performance-engineering-best-practices' },
    ]
  },
  'mem-util': {
    title: 'Memory Utilization',
    text: 'Fraction of usable GPU memory consumed: (model_weights + KV_cache + overhead) / usable_memory. Exceeding 100% causes out-of-memory errors — requests queue or fail.',
    range: '≤75% = comfortable · 75–90% = monitor carefully · >90% = OOM risk',
    links: [
      { t: 'PagedAttention: efficient KV cache (arXiv)', u: 'https://arxiv.org/abs/2309.06180' },
      { t: 'vLLM memory management docs', u: 'https://docs.vllm.ai/en/latest/design/kernel/paged_attention.html' },
    ]
  },
  'prefill-util': {
    title: 'Prefill Compute Utilization',
    text: 'GPU TFLOPS consumed by prompt processing (prefill phase) as a fraction of effective compute capacity. Prefill is compute-bound — it processes all input tokens in a single batched forward pass.',
    range: 'Under 80% is safe. >85% means new requests queue behind in-progress prefills.',
    links: [
      { t: 'Chunked prefill for better utilization (arXiv)', u: 'https://arxiv.org/abs/2401.08671' },
      { t: 'Sarathi-Serve: chunked prefill scheduling', u: 'https://arxiv.org/abs/2308.16369' },
    ]
  },
  'decode-util': {
    title: 'Decode Throughput Utilization',
    text: 'Fraction of effective decode capacity being consumed. At small batch sizes, decode is memory-bandwidth bound — throughput scales linearly with batch size up to the crossover point.',
    links: [
      { t: 'Speculative decoding to improve decode speed (arXiv)', u: 'https://arxiv.org/abs/2211.17192' },
      { t: 'Medusa: multiple decoding heads', u: 'https://arxiv.org/abs/2401.10774' },
    ]
  },
  'mem-chart': {
    title: 'GPU Memory Breakdown',
    text: 'How total GPU VRAM is partitioned: (1) Model Weights — fixed cost: params × bytes/param. (2) KV Cache — grows with concurrent requests × sequence length. (3) Free — available headroom. (4) Framework Overhead — CUDA, PyTorch, NCCL buffers.',
    links: [
      { t: 'PagedAttention paper (arXiv)', u: 'https://arxiv.org/abs/2309.06180' },
      { t: 'FlashAttention-2 memory analysis (arXiv)', u: 'https://arxiv.org/abs/2307.08691' },
    ]
  },
  'max-rps-chart': {
    title: 'Max RPS by Constraint',
    text: 'The maximum sustainable request rate from each independent resource constraint. The binding (smallest) value is your true maximum throughput. Focus optimization efforts on that constraint.',
    links: [
      { t: 'Bottleneck analysis for LLM serving', u: 'https://www.anyscale.com/blog/llm-inference-performance-engineering-best-practices' },
    ]
  },
  'ttft': {
    title: 'Time to First Token (TTFT)',
    text: 'Latency from request arrival to the first generated token — equal to the prefill phase duration. Users perceive this as "time waiting for the response to begin." Longer prompts = longer TTFT.',
    range: 'Interactive UX target: <300ms · Acceptable: <1s · Background tasks: any',
    links: [
      { t: 'LLM inference latency metrics (Anyscale blog)', u: 'https://www.anyscale.com/blog/llm-inference-performance-engineering-best-practices' },
      { t: 'Chunked prefill to reduce TTFT', u: 'https://arxiv.org/abs/2401.08671' },
    ]
  },
  'tbt': {
    title: 'Time Between Tokens (TBT)',
    text: 'Time between consecutive generated tokens — the inverse of the single-request decode rate. Memory-bandwidth bound at small batch sizes. Users perceive this as the "typing speed" of the streamed response.',
    range: 'Imperceptible: <30ms · Comfortable reading: 30–100ms · Noticeable slow: >200ms',
    links: [
      { t: 'Understanding LLM streaming performance', u: 'https://www.anyscale.com/blog/llm-inference-performance-engineering-best-practices' },
    ]
  },
  'e2e-latency': {
    title: 'End-to-End Latency (E2E)',
    text: 'Total time from request submission to last token: TTFT + (output_tokens × TBT). This is the user-facing response time. Note: at high concurrency, queuing adds latency not captured here.',
    range: 'Interactive chat: <3s · Agentic/long-form: <30s',
    links: [
      { t: "Little's Law — used to derive concurrency", u: 'https://en.wikipedia.org/wiki/Little%27s_law' },
    ]
  },
  'concurrent-reqs': {
    title: 'Concurrent Requests (Estimated)',
    text: "Number of requests in-flight simultaneously, estimated via Little's Law: concurrent = RPS × E2E_latency × concurrency_factor. This determines how much KV cache memory is needed at steady state.",
    links: [
      { t: "Little's Law (Wikipedia)", u: 'https://en.wikipedia.org/wiki/Little%27s_law' },
      { t: 'Continuous batching for LLM serving', u: 'https://www.anyscale.com/blog/continuous-batching-llm-inference' },
    ]
  },
  'crossover-batch': {
    title: 'Decode Crossover Batch Size',
    text: 'Batch size at which decode shifts from memory-bandwidth bound to compute bound. Below this threshold: each additional concurrent request scales decode throughput linearly. Above it: you hit the TFLOPS ceiling.',
    range: 'Typical range: 10–500, depending on model size and GPU bandwidth-to-compute ratio.',
    links: [
      { t: 'Roofline model for ML performance', u: 'https://en.wikipedia.org/wiki/Roofline_model' },
    ]
  },
  'kv-per-tok': {
    title: 'KV Cache per Token',
    text: 'Memory to store one token\'s Key and Value tensors across all attention layers: 2 × layers × kv_heads × head_dim × bytes_per_kv. With GQA (Llama 3, Mistral), fewer kv_heads dramatically shrinks this.',
    links: [
      { t: 'Grouped Query Attention (GQA) paper', u: 'https://arxiv.org/abs/2305.13245' },
      { t: 'Multi-Query Attention (MQA) paper', u: 'https://arxiv.org/abs/1911.02150' },
    ]
  },
  'kv-per-req': {
    title: 'KV Cache per Request',
    text: 'Total KV memory for one complete request context (input + output tokens): kv_per_token × (input_tokens + output_tokens). This is the per-request memory cost that must fit within the KV budget for each concurrent user.',
  },
  'total-kv': {
    title: 'Total KV Cache Allocated',
    text: 'KV memory allocated across all concurrent requests: concurrent_requests × kv_per_request. If this exceeds the KV budget, the system must queue requests or reduce sequence length.',
  },
  'kv-budget': {
    title: 'KV Cache Budget',
    text: 'GPU memory available for KV cache after subtracting model weights and framework overhead: usable_memory − model_memory. This is the hard ceiling on how many concurrent requests can be held in memory.',
    links: [
      { t: 'vLLM KV cache scheduling', u: 'https://docs.vllm.ai/en/latest/design/kernel/paged_attention.html' },
    ]
  },
  'max-concurrent-mem': {
    title: 'Max Concurrent (Memory-Limited)',
    text: 'Maximum in-flight requests before the KV cache budget is exhausted: floor(kv_budget / kv_per_request). Exceeding this causes OOM unless requests are queued or preempted.',
  },
  'total-bw': {
    title: 'Total Cluster Memory Bandwidth',
    text: 'Aggregate HBM bandwidth across all GPUs: num_gpus × GPU_bandwidth_GBps. This is the primary throughput driver for decode at small batch sizes (memory-bandwidth bound regime).',
    links: [
      { t: 'NVIDIA H100 bandwidth specifications', u: 'https://resources.nvidia.com/en-us-tensor-core/nvidia-tensor-core-gpu-datasheet' },
      { t: 'AMD MI300X bandwidth (192GB HBM3)', u: 'https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html' },
    ]
  },
  'single-decode-rate': {
    title: 'Single-Request Decode Rate',
    text: 'Peak tokens/second for one isolated request when the cluster is dedicated to it: total_bandwidth / (active_params × bytes_per_param). This sets the floor on streaming latency (TBT = 1 / this rate).',
  },
  'eff-decode-tps': {
    title: 'Effective Decode Throughput',
    text: 'Total decode tokens/second at the current concurrent batch: min(concurrent × single_decode_rate, compute_bound_rate). Scales linearly with batch up to the crossover, then plateaus.',
    links: [
      { t: 'Speculative decoding to surpass BW ceiling', u: 'https://arxiv.org/abs/2211.17192' },
    ]
  },
  'max-prefill-tps': {
    title: 'Max Prefill Throughput',
    text: 'Peak rate at which the cluster can process prompt tokens (compute-bound): GPUs × FP16_TFLOPS × MFU / (2 × active_params). Caps the rate at which new requests can start.',
    links: [
      { t: 'PaLM paper introducing MFU metric', u: 'https://arxiv.org/abs/2204.02311' },
    ]
  },
  'eff-tflops': {
    title: 'Effective Cluster TFLOPS',
    text: 'Practical compute available: peak_TFLOPS × MFU. At 40% MFU on 8× H100 SXM5 (1979 TF each), effective = 8 × 1979 × 0.40 ≈ 6,333 TFLOPS. MFU accounts for memory stalls, communication overhead, and kernel launch gaps.',
    links: [
      { t: 'MFU metric (PaLM paper)', u: 'https://arxiv.org/abs/2204.02311' },
      { t: 'Measuring GPU utilization (NVIDIA)', u: 'https://developer.nvidia.com/blog/maximizing-deep-learning-inference-performance-with-nvidia-model-analyzer/' },
    ]
  },
  'total-tdp': {
    title: 'Total GPU Power (TDP)',
    text: 'Sum of rated Thermal Design Power for all GPUs: num_gpus × GPU_TDP_W. Actual inference power draw is typically 80–95% of TDP. Useful for cooling requirements and energy cost estimates.',
    links: [
      { t: 'Data center power planning guide (NVIDIA)', u: 'https://docs.nvidia.com/datacenter/tesla/tesla-installation-notes/index.html' },
    ]
  },
  'cost-per-hr': {
    title: 'Total Cost per Hour',
    text: 'Total compute cost per hour: num_gpus × cost_per_gpu_hr. Does not include networking, storage, or orchestration overhead. For spot/preemptible instances, actual cost may be 60–80% lower.',
    links: [
      { t: 'AWS EC2 GPU on-demand pricing', u: 'https://aws.amazon.com/ec2/pricing/on-demand/' },
      { t: 'Google Cloud GPU pricing', u: 'https://cloud.google.com/compute/gpus-pricing' },
    ]
  },
  'cost-per-mtok': {
    title: 'Cost per 1M Output Tokens',
    text: 'Amortized token cost at current RPS: cost_per_hr / (output_tokens_per_hr / 1e6). This metric improves with higher GPU utilization — an idle cluster still costs the same per hour.',
    range: 'Self-hosted range: $0.10–$5/M tokens. API providers: $0.50–$30/M tokens.',
    links: [
      { t: 'LLM inference cost benchmarks (Artificial Analysis)', u: 'https://artificialanalysis.ai/' },
      { t: 'Cost comparison: self-hosted vs API', u: 'https://www.anyscale.com/blog/llm-inference-performance-engineering-best-practices' },
    ]
  },
  'min-gpus': {
    title: 'Minimum GPUs Recommended',
    text: 'Estimated minimum GPU count to serve the current RPS without saturation, based on the binding utilization. Add a 30%+ safety buffer above this minimum for burst tolerance.',
  },
  'output-mtok': {
    title: 'Output Megatokens per Hour',
    text: 'Total output tokens generated per hour: RPS × output_tokens × 3600 / 1,000,000. Useful as a throughput KPI or for estimating infrastructure needed to serve a specific token volume SLA.',
  },
  'bottleneck-badge': {
    title: 'Binding Bottleneck',
    text: 'The resource that saturates first as load increases, determining max_RPS. Three possible bottlenecks and their fixes:\n\n• KV Cache Memory → FP8 KV cache, INT4 weights, reduce seq len, add GPUs\n• Prefill Compute → prefix caching, chunked prefill, prompt compression\n• Decode Compute → speculative decoding, smaller model, INT4 quantization',
    links: [
      { t: 'Prefix caching in vLLM (automatic prefix caching)', u: 'https://docs.vllm.ai/en/latest/automatic_prefix_caching/apc.html' },
      { t: 'Speculative decoding overview', u: 'https://arxiv.org/abs/2211.17192' },
      { t: 'Continuous batching for LLM serving', u: 'https://www.anyscale.com/blog/continuous-batching-llm-inference' },
    ]
  },
  'mem-util-bar':    { title: 'Memory Utilization', text: 'Total memory used ÷ usable memory. High values leave little room for additional concurrent requests or longer sequences.' },
  'prefill-util-bar':{ title: 'Prefill Compute Utilization', text: 'TFLOPS consumed by prompt prefill ÷ effective compute. At saturation, new requests queue until an in-progress prefill completes.', links: [{ t: 'Chunked prefill (arXiv)', u:'https://arxiv.org/abs/2401.08671' }] },
  'decode-util-bar': { title: 'Decode Throughput Utilization', text: 'Required decode tokens/sec ÷ effective decode capacity. Since decode capacity scales with batch size, this tracks how well bandwidth is used.', links: [{ t: 'Speculative decoding (arXiv)', u:'https://arxiv.org/abs/2211.17192' }] },
  'bw-util-bar':     { title: 'Bandwidth Saturation (Decode)', text: 'How close concurrent requests are to the crossover batch size. At 100% you are fully in the bandwidth-bound regime; beyond crossover you become compute-bound.', links: [{ t: 'Roofline model', u:'https://en.wikipedia.org/wiki/Roofline_model' }] },
};
