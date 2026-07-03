// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
loadCustomData();
const restoredFromURL = loadStateFromURL();
onGPUChange();
onModelChange();
g('spot-cost-per-gpu-hr').disabled = !g('spot-enabled').checked;
initTooltips();
if (restoredFromURL) calculate();
