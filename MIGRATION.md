# Migration Guide - v3.2.0

## What Changed?

Version 3.2.0 introduces ES module (ESM) support as the primary distribution format while maintaining backward compatibility with CommonJS and browser usage.

## Breaking Changes

### 1. Package Distribution Format

The package now uses **dual package exports** with ESM as the default:

**Before (v3.x):**
- Single UMD bundle: `dist/chartjs-plugin-trendline.min.js`
- CommonJS-style package

**After (v3.2.x):**
- ESM build: `dist/chartjs-plugin-trendline.esm.js`
- CommonJS build: `dist/chartjs-plugin-trendline.cjs`
- UMD build (unminified): `dist/chartjs-plugin-trendline.js`
- UMD build (minified): `dist/chartjs-plugin-trendline.min.js`

### 2. Import Changes

#### Modern Bundlers (Vite, SvelteKit, Next.js, webpack 5)
No changes needed! Your bundler will automatically use the ESM version:

```javascript
import ChartJSTrendline from 'chartjs-plugin-trendline';
```

#### Node.js with CommonJS
The CommonJS build is automatically used when using `require()`:

```javascript
const ChartJSTrendline = require('chartjs-plugin-trendline');
```

#### Browser via CDN
The global export name has changed:

**Before:**
```html
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-trendline@3"></script>
<!-- Plugin auto-registered with Chart.js -->
```

**After:**
```html
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-trendline@3"></script>
<script>
  // Option 1: Plugin auto-registers if Chart.js is available
  // Option 2: Manual registration
  Chart.register(ChartJSTrendline);
</script>
```

## Benefits

### For Modern Projects
- ✅ Better tree-shaking support
- ✅ Faster build times with Vite, SvelteKit, and modern bundlers
- ✅ Full ESM support
- ✅ Smaller bundle sizes (only import what you need)

### For Legacy Projects
- ✅ Backward compatible with CommonJS
- ✅ UMD builds still available for browser `<script>` tags
- ✅ Works with older webpack and Node.js versions

## Recommendations

### New Projects
Use ESM imports with modern bundlers (Vite, SvelteKit, Next.js, Nuxt):

```javascript
import ChartJSTrendline from 'chartjs-plugin-trendline';
import { Chart } from 'chart.js';

Chart.register(ChartJSTrendline);
```

### Legacy Projects
Continue using CommonJS `require()`:

```javascript
const ChartJSTrendline = require('chartjs-plugin-trendline');
const Chart = require('chart.js');

Chart.register(ChartJSTrendline);
```

### Browser CDN
Use the minified UMD build:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-trendline@3"></script>
```

## Technical Details

### Package.json Configuration

```json
{
  "type": "module",
  "main": "./dist/chartjs-plugin-trendline.cjs",
  "module": "./dist/chartjs-plugin-trendline.esm.js",
  "exports": {
    ".": {
      "import": "./dist/chartjs-plugin-trendline.esm.js",
      "require": "./dist/chartjs-plugin-trendline.cjs"
    }
  }
}
```

This ensures:
- Modern bundlers use the ESM version
- Node.js `require()` uses the CommonJS version
- Maximum compatibility across environments

## Questions?

If you encounter any issues during migration, please [open an issue](https://github.com/Makanz/chartjs-plugin-trendline/issues) on GitHub.
