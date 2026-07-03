// ══════════════════════════════════════════════
// SHAREABLE URL STATE
// ══════════════════════════════════════════════
// Maps form element ids to short query-param keys so a config is a link,
// not a re-typed form.
const URL_FIELD_MAP = {
  'rps':'rps', 'input-tokens':'in', 'output-tokens':'out',
  'cached-tokens':'ctok', 'cache-hit-rate':'chr',
  'model':'model', 'gpu':'gpu', 'precision':'prec', 'kv-precision':'kvprec',
  'num-gpus':'ngpu', 'gpus-per-node':'gpn',
  'mfu':'mfu', 'overhead':'oh', 'conc-factor':'cf', 'cost-per-gpu-hr':'cost',
  'spot-enabled':'spot', 'spot-cost-per-gpu-hr':'spotcost',
  'lora-enabled':'lora', 'lora-rank':'lorar', 'lora-adapters':'loraa',
  'c-params':'cp', 'c-layers':'cl', 'c-kv-heads':'ckv', 'c-heads':'ch',
  'c-head-dim':'chd', 'c-active':'ca',
};

function buildStateParams() {
  const params = new URLSearchParams();
  Object.entries(URL_FIELD_MAP).forEach(([id, key]) => {
    const el = g(id);
    if (!el) return;
    if (el.type === 'checkbox') { if (el.checked) params.set(key, '1'); }
    else if (el.value !== '' && el.value != null) params.set(key, el.value);
  });
  return params;
}

function updateURLFromState() {
  const params = buildStateParams();
  history.replaceState(null, '', location.pathname + '?' + params.toString());
}

function copyShareLink() {
  const params = buildStateParams();
  const url = location.origin + location.pathname + '?' + params.toString();
  copyToClipboard(url).then(() => showToast('🔗 Share link copied to clipboard'));
}

// Returns true if any state was restored from the URL.
function loadStateFromURL() {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return false;
  Object.entries(URL_FIELD_MAP).forEach(([id, key]) => {
    const el = g(id);
    if (!el || !params.has(key)) return;
    if (el.type === 'checkbox') el.checked = params.get(key) === '1';
    else el.value = params.get(key);
  });
  return true;
}
