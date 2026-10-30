// Export target registry. Tier 1 is implemented; Tier 2/3 are hooks with the plan written down
// (market evaluation 2026-10-30, scratchpad targets-evaluation.md). An adapter module exports
// `meta` and `exportTarget(ir, opts) -> { files: Map<path, string|Buffer>, notes: string[], postCheck }`.

const PLANNED = {
  // Tier 2: next. Each needs an import test before it is called "ready".
  'elementor-sections': { tier: 2, label: 'Elementor section templates', todo: 'TODO(elementor-sections): section templates for the elementor target only with an import test on a disposable WordPress (wp elementor kit import) plus kk compare; V4 variables once their storage format is documented.' },
  shopify: { tier: 2, label: 'Shopify (Horizon preset)', todo: 'TODO(shopify): map tokens to a Horizon theme preset: config/settings_data.json (color_scheme_group, type settings) plus assets/kk-tokens.css; fonts only from the Shopify font library or as theme assets; sections stay Liquid of the base theme.' },
  figma: { tier: 2, label: 'Figma variables (Code to Canvas)', todo: 'TODO(figma): emit a Figma variables collection (modes light/dark) from tokens.json and push it through the Figma MCP (Code to Canvas); text styles from typography roles. Needs a plan check for variable import.' },
  webflow: { tier: 2, label: 'Webflow (MCP)', todo: 'TODO(webflow): create Webflow variables (colours, sizes, fonts) and classes from site.css through the official Webflow MCP Designer tools; no HTML import exists, sections are rebuilt as Webflow components.' },
  // Tier 3: through partners or on demand.
  framer: { tier: 3, label: 'Framer', todo: 'TODO(framer): tokens as Framer styles by hand or plugin; no tested import path.' },
  typo3: { tier: 3, label: 'TYPO3', todo: 'TODO(typo3): site package with Fluid templates per section and content elements; via a TYPO3 partner.' },
  shopware: { tier: 3, label: 'Shopware', todo: 'TODO(shopware): theme.json + SCSS variables from tokens; via a Shopware partner.' },
  // Secondary: the documented React path is `react` (works in Next.js, TanStack Start, Vite).
  next: { tier: 'secondary', label: 'Next.js app scaffold', todo: 'TODO(next): optional full App Router scaffold (output: export, next/font/local, app/sitemap.ts, robots.ts) around the `react` package. Use --target react and drop the package into a Next.js app instead.' },
};

const READY = { html: () => import('./html.js'), astro: () => import('./astro.js'), react: () => import('./react.js'), wordpress: () => import('./wordpress.js'), elementor: () => import('./elementor.js') };

export const TARGETS = Object.keys(READY);
export const PLANNED_TARGETS = Object.keys(PLANNED);
export function listTargets() {
  return [
    { id: 'html', tier: 1, status: 'ready' }, { id: 'astro', tier: 1, status: 'ready' }, { id: 'react', tier: 1, status: 'ready' }, { id: 'wordpress', tier: 1, status: 'first version' }, { id: 'elementor', tier: 1, status: 'first version (design layer)' },
    ...Object.entries(PLANNED).map(([id, p]) => ({ id, tier: p.tier, status: 'planned', label: p.label, todo: p.todo })),
  ];
}
export async function loadAdapter(target) {
  if (READY[target]) return READY[target]();
  if (PLANNED[target]) throw Object.assign(new Error(`target "${target}" is planned, not implemented yet. ${PLANNED[target].todo}`), { code: 'BAD_INPUT' });
  throw Object.assign(new Error(`unknown target "${target}". Ready: ${TARGETS.join(', ')}; planned: ${PLANNED_TARGETS.join(', ')}`), { code: 'BAD_INPUT' });
}
