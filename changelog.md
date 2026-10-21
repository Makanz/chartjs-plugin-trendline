# Changelog 3.2.14

### Dependencies
- Updated dev dependencies (jest 30.5.2, babel-jest 30.5.2, jest-environment-jsdom 30.5.2, jest-canvas-mock 2.5.8, rollup 4.64.10, @babel/core 7.29.7, @babel/preset-env 7.29.7)
- Bumped the `brace-expansion` override to 2.1.7, patching three DoS advisories (GHSA-6j4f-fj2g-mc7p, GHSA-qhr7-859c-m2p7, GHSA-q2hr-2g5m-vwhr)

### Documentation
- Updated the LICENSE copyright year to 2025-2026

# Changelog 3.1.0

### New Features
- Added exponential trendline support with `trendlineExponential` configuration
- Exponential trendlines fit curves of the form y = a × e^(b×x)
- All existing styling options (colors, width, lineStyle, projection, etc.) work with exponential trendlines
- Added comprehensive test coverage for exponential functionality
- Added exponential trendline example (exponentialChart.html)

### Improvements
- Updated README with exponential trendline documentation
- Enhanced package description to mention exponential support

# Changelog 3.0.0

### Breaking Changes
- Updated to version 3.0.0-beta.1 with modular code structure

### New Features
- Added trendline offset setting (`trendoffset`)
- Added two new example files (barChartWithNullValues.html, scatterProjection.html)

### Bug Fixes
- Fixed trendline accuracy and boundary calculations
- Corrected trendline rendering, projection, and data accuracy
- Fixed trendline data processing issues

### Testing & CI
- Added comprehensive unit tests for all components (trendline, label, drawing utils, lineFitter)
- Added GitHub Actions workflow for automated testing on PRs and main branch
- Updated Node.js version to 22 in CI

### Code Quality
- Split code into modular structure with separate components
- Added Copilot instructions for development
- Updated Chart.js dependency to version 4.4.9

### Documentation
- Updated README with new features
- Added agent instructions for development workflow