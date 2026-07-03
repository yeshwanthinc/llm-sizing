// ══════════════════════════════════════════════
// TOOLTIP LOGIC
// ══════════════════════════════════════════════
let tipTimer = null;
const ttEl = document.getElementById('tt');

function showTip(anchor) {
  clearTimeout(tipTimer);
  const id = anchor.dataset.tipId;
  const data = TIPS[id];
  if (!data) return;

  g('tt-title').textContent = data.title;
  g('tt-text').textContent  = data.text;

  const rangeEl = g('tt-range');
  if (data.range) { rangeEl.textContent = '📊 ' + data.range; rangeEl.style.display='block'; }
  else rangeEl.style.display = 'none';

  const linksEl = g('tt-links');
  if (data.links && data.links.length) {
    linksEl.innerHTML = data.links.map(l =>
      `<a href="${l.u}" target="_blank" rel="noopener noreferrer">${l.t}</a>`
    ).join('');
    linksEl.style.display = 'flex';
    ttEl.classList.add('has-links');
  } else {
    linksEl.style.display = 'none';
    ttEl.classList.remove('has-links');
  }

  // Position: right of anchor, or left if near right edge
  const rect = anchor.getBoundingClientRect();
  ttEl.classList.add('show');
  const ttW = ttEl.offsetWidth || 290;
  const ttH = ttEl.offsetHeight || 150;
  let left = rect.right + 10;
  let top  = rect.top - 4;
  if (left + ttW > window.innerWidth - 10) left = rect.left - ttW - 10;
  if (top + ttH > window.innerHeight - 10) top = window.innerHeight - ttH - 10;
  if (top < 10) top = 10;
  ttEl.style.left = left + 'px';
  ttEl.style.top  = top  + 'px';
}

function schedulHide() {
  tipTimer = setTimeout(() => ttEl.classList.remove('show'), 250);
}

function initTooltips() {
  document.querySelectorAll('[data-tip-id]').forEach(el => {
    el.addEventListener('mouseenter', () => showTip(el));
    el.addEventListener('mouseleave', schedulHide);
  });
  ttEl.addEventListener('mouseenter', () => clearTimeout(tipTimer));
  ttEl.addEventListener('mouseleave', schedulHide);
}
