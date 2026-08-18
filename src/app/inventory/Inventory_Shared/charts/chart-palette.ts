import {
  Chart,
  BarController,
  LineController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Legend,
  Tooltip,
  Filler
} from 'chart.js';

// Module-level registration, not `provideCharts()` in app.config.ts. This
// federated Inventory remote's own app.config.ts providers are dead once
// loaded into OneSphere-Accounts' shell at runtime (the same class of gotcha
// as the global styles.scss duplication — see erp_inventory_accounts_shared_
// css_duplication memory) — confirmed live: the Stock Valuation Comparison
// report's bar chart failed with "category is not a registered scale"
// through the real served app on :4200 despite `provideCharts(withDefault
// Registerables())` being present in this app's own app.config.ts and every
// unit test passing (TestBed respects that config; the federated host
// doesn't). An ES module's top-level code always runs once when the module
// is first imported, regardless of which app's injector loaded it — so
// registering here, at the top of the one file every chart wrapper already
// imports, is federation-safe in a way DI-based registration isn't.
// `provideCharts()` stays in app.config.ts too (harmless, and it's what
// TestBed-based unit tests exercise), this is the registration that
// actually matters live.
Chart.register(
  BarController, LineController, DoughnutController,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Legend, Tooltip, Filler
);

// Categorical palette validated via the dataviz skill's validate_palette.js
// (light mode, worst adjacent pair well clear of both the CVD-separation and
// normal-vision floors) — the first 3 slots of the reference palette, which
// is the set that clears all-pairs comparison too, not just adjacent pairs.
// Fixed order, never cycled/regenerated per chart — a chart needing a 4th
// series should fold the extra into "Other" or facet instead of drawing
// from slot 4+.
export const CHART_SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a'] as const;

// Chart chrome, matching this app's existing report/dashboard ink scale
// (#0f172a strong text, #64748b muted text, #e5edf7 hairlines) rather than
// the dataviz skill's own reference-instance ink (kept as the categorical
// data-color source of truth, not the surrounding chrome, per "honor what's
// already there").
export const CHART_INK = {
  text: '#334155',
  muted: '#64748b',
  grid: '#eef2f7',
  axis: '#cbd5e1'
} as const;
