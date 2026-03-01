# Chart.js Plugin Trendline — Agent Instructions

This repository contains a Chart.js plugin that adds linear trendline support to charts. It fits regression models to datasets and draws trendlines over bar, line, and scatter charts.

## Development Commands

- `pnpm run build` - Build the minified plugin using webpack
- `pnpm test` - Run Jest tests for all components

## Project Structure

- Root:
  - `package.json`, `webpack.config.js`, `example/*.html`
- Source (`src/`):
  - `index.js` - Entry point; auto-registers plugin globally and exports for manual registration
  - `core/plugin.js` - Main plugin lifecycle integration (`afterDatasetsDraw`, `beforeInit`)
  - `components/` - Rendering logic for trendlines and labels
  - `utils/` - Math calculations (`lineFitter.js`) and drawing helpers (`drawing.js`)

## Key Implementation Details

- Integrates with the Chart.js v4+ plugin lifecycle using `afterDatasetsDraw`
- Draws trendlines after datasets so lines appear on top
- Uses dataset `order` behavior (0-order datasets draw last)
- Reads configuration from the dataset `trendlineLinear` property
- Supports projection mode, custom styling, and labels with legends

## Coding Standards

1. Use modern JavaScript (ES6+)
2. Indent with 2 spaces
3. Use JSDoc for public methods (Google style)
4. Use descriptive names without abbreviations
5. Ensure Chart.js v4+ compatibility

## Workflow Guidelines

1. Keep `plugin.js` changes aligned with Chart.js lifecycle hooks
2. If editing trendline rendering, verify behavior across supported chart types
3. Validate rendering with `example/*.html` after code updates
4. Run lint/format if configured (for example via `.eslintrc.js`)
5. Ensure tests pass before finishing changes

## File Notes

- `src/core/plugin.js`: Main plugin lifecycle integration
- `src/components/trendline.js`: Trendline rendering behavior
- `src/utils/lineFitter.js`: Regression math
- `example/*.html`: Manual visual verification targets

## Restrictions

- Do not modify build config unless build behavior must change
- Do not auto-generate example files

## Chart Type Support

Currently supports: bar, line, scatter charts
