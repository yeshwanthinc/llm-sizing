// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function g(id)    { return document.getElementById(id) }
function getNum(id){ return parseFloat(g(id).value) || 0 }
function esc(s)   { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function fmtGB(n) {
  const b = n * 1e9;
  if(b >= 1e9) return n.toFixed(1)+' GB';
  if(b >= 1e6) return (b/1e6).toFixed(0)+' MB';
  if(b >= 1e3) return (b/1e3).toFixed(0)+' KB';
  return b.toFixed(0)+' B';
}
function fmtKV(gbPT) {
  const b = gbPT * 1e9;
  return b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : (b/1e3).toFixed(0)+' KB';
}
function fmtK(n)  { return n >= 1000 ? (n/1000).toFixed(1)+'k' : n.toFixed(0) }
function pct(n)   { return Math.min(999, n*100).toFixed(1)+'%' }
function fmtMs(s) { return s < 1 ? (s*1000).toFixed(0)+'ms' : s.toFixed(2)+'s' }
function fmtTPS(n){ if(n>=1e6) return (n/1e6).toFixed(1)+'M t/s'; if(n>=1e3) return (n/1e3).toFixed(1)+'k t/s'; return n.toFixed(0)+' t/s' }
function statusColor(v) { return v<=.70?'var(--green)':v<=.90?'var(--yellow)':'var(--red)' }
function spareClass(sp) { return sp>=30?'sg':sp>=10?'sy':'sr' }
