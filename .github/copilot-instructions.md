# Chart.js Plugin Trendline — Copilot Instructions

This plugin adds trendline support to Chart.js charts. It fits a linear regression model to datasets and draws trendlines over bar or line charts.

## Project Structure

-   Root:
    -   `package.json`, `webpack.config.js`, `example/*.html`
-   Source (`src/`):
    -   `index.js` — Entry point
    -   `components/` — Rendering logic (`label.js`, `trendline.js`)
    -   `core/` — Plugin definition (`plugin.js`)
    -   `utils/` — Math and drawing helpers (`drawing.js`, `lineFitter.js`)

## Coding Guidelines

1. Use modern JavaScript (ES6+)
2. Indent with 2 spaces
3. Use JSDoc for public methods (Google style)
4. Ensure compatibility with Chart.js v4+
5. Name files/functions descriptively (no abbreviations)

## File Notes

-   `plugin.js`: Main plugin lifecycle integration
-   `trendline.js`: Handles drawing trendlines
-   `lineFitter.js`: Performs regression math
-   `example/*.html`: Demo charts — manually verify after changes

## Workflow Tips

1. Changes to `plugin.js` should align with Chart.js plugin lifecycle (e.g., `afterDatasetsDraw`)
2. If editing `trendline.js`, test with multiple chart types
3. Validate rendering via example HTMLs after code updates
4. Run linter and formatter before commit (see `.eslintrc.js` if present)

## Restrictions

-   Do not modify build config unless changing build behavior
-   Do not auto-generate example files
