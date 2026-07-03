// ══════════════════════════════════════════════
// GPU & MODEL DATA
// ══════════════════════════════════════════════
// [memGB, bwGBps, fp16TFLOPS, fp8TFLOPS_or_null, tdpW, interconnect]
const GPU_SPECS = {
  "NVIDIA B200 SXM":           [180, 8000, 4500, 9000,  1000, "NVLink 5"],
  "NVIDIA H200 SXM":           [141, 4800, 1979, 3958,   700, "NVLink 4"],
  "NVIDIA H100 SXM5 80GB":     [ 80, 3350, 1979, 3958,   700, "NVLink 4"],
  "NVIDIA H100 PCIe 80GB":     [ 80, 2000, 1513, 3026,   350, "PCIe 5.0"],
  "NVIDIA A100 SXM4 80GB":     [ 80, 2000,  312, null,   400, "NVLink 3"],
  "NVIDIA A100 SXM4 40GB":     [ 40, 1555,  312, null,   400, "NVLink 3"],
  "NVIDIA A100 PCIe 80GB":     [ 80, 1935,  312, null,   300, "PCIe 4.0"],
  "NVIDIA A100 PCIe 40GB":     [ 40, 1555,  312, null,   300, "PCIe 4.0"],
  "NVIDIA A40 48GB":           [ 48,  696,  150, null,   300, "PCIe 4.0"],
  "NVIDIA A10G 24GB":          [ 24,  600,  125, null,   150, "PCIe 4.0"],
  "NVIDIA L40S 48GB":          [ 48,  864,  733, 1466,   350, "PCIe 5.0"],
  "NVIDIA RTX A6000 Ada 48GB": [ 48,  864,  309, null,   300, "PCIe 4.0"],
  "NVIDIA RTX 4090 24GB":      [ 24, 1008,  165,  330,   450, "PCIe 4.0"],
  "NVIDIA V100 SXM2 32GB":     [ 32,  900,  125, null,   300, "NVLink 2"],
  "NVIDIA V100 PCIe 16GB":     [ 16,  900,  112, null,   250, "PCIe 3.0"],
  "AMD MI300X 192GB":          [192, 5300, 1307, 2614,   750, "Infinity Fabric"],
  "AMD MI250X 128GB":          [128, 3276,  383, null,   500, "Infinity Fabric"],
  "AMD MI100 32GB":            [ 32, 1200,  184, null,   300, "Infinity Fabric"],
  "Intel Gaudi 3 128GB":       [128, 3700, 1800, null,   600, "PCIe 5.0"],
};

// { p:params_B, L:layers, kv:kv_heads, h:attn_heads, hd:head_dim, ap:active_params_B, moe:bool }
const MODEL_SPECS = {
  "Llama 3.2 1B":             { p:1,    L:16,  kv:8,   h:32,  hd:64  },
  "Llama 3.2 3B":             { p:3,    L:28,  kv:8,   h:24,  hd:128 },
  "Llama 3.1 8B":             { p:8,    L:32,  kv:8,   h:32,  hd:128 },
  "Llama 3.1 70B":            { p:70,   L:80,  kv:8,   h:64,  hd:128 },
  "Llama 3.3 70B":            { p:70,   L:80,  kv:8,   h:64,  hd:128 },
  "Llama 3.1 405B":           { p:405,  L:126, kv:8,   h:128, hd:128 },
  "Mistral 7B v0.3":          { p:7,    L:32,  kv:8,   h:32,  hd:128 },
  "Mistral Nemo 12B":         { p:12,   L:40,  kv:8,   h:32,  hd:128 },
  "Mixtral 8x7B (MoE)":       { p:46.7, L:32,  kv:8,   h:32,  hd:128, ap:12.9, moe:true },
  "Mixtral 8x22B (MoE)":      { p:141,  L:56,  kv:8,   h:48,  hd:128, ap:39,   moe:true },
  "Gemma 2B":                 { p:2,    L:18,  kv:1,   h:8,   hd:256 },
  "Gemma 7B":                 { p:7,    L:28,  kv:16,  h:16,  hd:256 },
  "Gemma 2 9B":                { p:9,    L:42,  kv:8,   h:16,  hd:256 },
  "Gemma 2 27B":              { p:27,   L:46,  kv:16,  h:32,  hd:128 },
  "Phi-3 Mini 3.8B":          { p:3.8,  L:32,  kv:32,  h:32,  hd:96  },
  "Phi-3 Medium 14B":         { p:14,   L:40,  kv:10,  h:40,  hd:128 },
  "Phi-4 14B":                { p:14,   L:40,  kv:10,  h:40,  hd:128 },
  "Qwen2.5 0.5B":             { p:0.5,  L:24,  kv:2,   h:14,  hd:64  },
  "Qwen2.5 1.5B":             { p:1.5,  L:28,  kv:2,   h:12,  hd:128 },
  "Qwen2.5 7B":               { p:7,    L:28,  kv:4,   h:28,  hd:128 },
  "Qwen2.5 14B":              { p:14,   L:48,  kv:8,   h:40,  hd:128 },
  "Qwen2.5 32B":              { p:32,   L:64,  kv:8,   h:40,  hd:128 },
  "Qwen2.5 72B":              { p:72,   L:80,  kv:8,   h:64,  hd:128 },
  "DeepSeek-R1 Distill 7B":   { p:7,    L:28,  kv:4,   h:28,  hd:128 },
  "DeepSeek-R1 Distill 14B":  { p:14,   L:28,  kv:16,  h:16,  hd:128 },
  "DeepSeek-R1 Distill 70B":  { p:70,   L:80,  kv:8,   h:64,  hd:128 },
  "DeepSeek-R1 671B (MoE)":   { p:671,  L:61,  kv:128, h:128, hd:128, ap:37, moe:true },
  "Custom":                   { p:null, L:null, kv:null, h:null, hd:null },
};

const PRECISION_BYTES = { fp32:4, fp16:2, bf16:2, fp8:1, int8:1, int4:0.5, nf4:0.5 };
