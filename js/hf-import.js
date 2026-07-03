// ══════════════════════════════════════════════
// HUGGING FACE config.json IMPORT
// ══════════════════════════════════════════════
// Removes the most tedious step of adding a custom model: manually
// transcribing layers/heads/head_dim from config.json. Supports both a
// direct fetch (works when HF's CDN sends permissive CORS headers) and a
// paste-JSON fallback that always works regardless of CORS.
function setHFStatus(msg, isError) {
  const el = g('hf-import-status');
  el.textContent = msg;
  el.classList.toggle('hf-err', !!isError);
}

function normalizeHFUrl(input) {
  let url = input.trim();
  if (/^https?:\/\//i.test(url)) {
    url = url.replace('/blob/', '/resolve/');
    if (!url.includes('config.json')) {
      url = url.replace(/\/$/, '') + '/resolve/main/config.json';
    }
    return url;
  }
  return `https://huggingface.co/${url.replace(/^\/+|\/+$/g, '')}/resolve/main/config.json`;
}

function applyHFConfigObject(obj, idHint) {
  const tc = obj.text_config || obj;
  const layers    = tc.num_hidden_layers || tc.n_layer || tc.num_layers;
  const heads     = tc.num_attention_heads || tc.n_head;
  const kvHeads   = tc.num_key_value_heads || heads;
  const hiddenSize= tc.hidden_size || tc.n_embd;
  const headDim   = tc.head_dim || (heads && hiddenSize ? Math.round(hiddenSize/heads) : null);
  const moe = !!(tc.num_local_experts || tc.num_experts || tc.n_routed_experts || tc.moe_num_experts);

  if (layers)  g('am-layers').value = layers;
  if (kvHeads) g('am-kv').value = kvHeads;
  if (heads)   g('am-heads').value = heads;
  if (headDim) g('am-hd').value = headDim;
  g('am-moe').value = moe ? '1' : '0';

  // Best-effort guess of param count from the model id (e.g. "Llama-3.1-70B" -> 70)
  const guessSrc = `${idHint||''} ${obj._name_or_path||''}`;
  const paramMatch = guessSrc.match(/(\d+(\.\d+)?)\s*[bB](?![a-zA-Z])/);
  if (paramMatch) { g('am-params').value = paramMatch[1]; g('am-active').value = paramMatch[1]; }

  if (!layers || !kvHeads || !headDim) {
    setHFStatus('Parsed partial data — some fields (layers/kv_heads/head_dim) were missing from this config.json. Fill the rest manually.', true);
    return;
  }
  setHFStatus(`✅ Parsed: ${layers} layers, ${kvHeads} KV heads, head_dim ${headDim}${moe ? ', MoE detected' : ''}. Double-check total/active parameter counts before saving.`, false);
}

function fetchHFConfig() {
  const raw = g('am-hf-id').value.trim();
  if (!raw) { setHFStatus('Enter a model ID (org/model) or a config.json URL.', true); return; }
  const url = normalizeHFUrl(raw);
  setHFStatus('Fetching ' + url + ' …', false);
  fetch(url)
    .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(obj => applyHFConfigObject(obj, raw))
    .catch(err => setHFStatus(
      `Fetch failed (${err.message}). This can happen due to CORS or network restrictions — open the URL yourself and paste the JSON below instead.`, true));
}

function parseHFConfigText() {
  const text = g('am-hf-paste').value.trim();
  if (!text) { setHFStatus('Paste config.json contents first.', true); return; }
  try {
    const obj = JSON.parse(text);
    applyHFConfigObject(obj, g('am-hf-id').value.trim());
  } catch (e) {
    setHFStatus('Invalid JSON: ' + e.message, true);
  }
}
