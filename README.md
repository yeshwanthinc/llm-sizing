# LLM GPU Capacity Sizing Calculator

A static, client-side calculator for estimating GPU memory usage, throughput, spare capacity, and cost for LLM inference deployments.

Open `index.html` directly in a browser, or visit the [hosted version on GitHub Pages](https://yeshwanthinc.github.io/llm-sizing/).

## Structure

- `index.html` — page markup
- `css/styles.css` — styles
- `js/specs.js` — GPU and model hardware/architecture data
- `js/tips.js` — tooltip content
- `js/helpers.js` — formatting/utility functions
- `js/storage.js` — custom GPU/model persistence (localStorage) + modal logic
- `js/tooltip.js` — tooltip display logic
- `js/selectors.js` — GPU/model dropdown change handlers
- `js/calculate.js` — core sizing calculations
- `js/render.js` — dashboard rendering (cards, chart, utilization bars, recommendations)
- `js/docs.js` — formulas/assumptions/glossary panel
- `js/main.js` — page init
