# Unreleased

### Performance
- The regression fit is now cached per chart update instead of being recomputed on every animation frame (`afterDatasetsDraw` runs ~60 times per second during an animation). Measured with 10 000 points per dataset: **3.20 ms → 0.003 ms per frame** for time-scale label data and **0.22 ms → 0.012 ms** for numeric data
- Dataset draw ordering is cached for the same reason
- Skips the gradient when `colorMin === colorMax` (the default when only one colour is configured) — one less `createLinearGradient` and two less `addColorStop` calls per dataset per frame
- Time-scale parsing no longer allocates a `Date` per point when the value is already a number, and the scale-type lookup is hoisted out of the per-point loop
- `ExponentialFitter` computes R² from running sums instead of storing a copy of every data point

### Bug Fixes
- `LineFitter` no longer returns `NaN` when every x value is identical (two points sharing a timestamp, for example). It degrades to a horizontal line through the mean y, so the trendline is drawn instead of silently disappearing
- `LineFitter` computes slope and intercept from running centred sums (Welford) instead of `count * sumx2 - sumx * sumx`, which cancelled away every significant digit once x was an epoch-millisecond value: a normal rising series spread over seconds or minutes fitted to slope 0 and was drawn as a flat line. The constant-x case is now detected on the centred sum of squares, where it is exact
- `beforeInit` no longer throws when the legend is disabled (`plugins.legend.display: false`) or absent
- Datasets are now fitted and drawn against the x scale Chart.js bound them to (`datasetMeta.xScale`) instead of one looked up by id. A chart that names its axis — `scales: { date: { type: 'time' } }` — had the trendline mapped through the default `x` scale Chart.js merges into every cartesian chart, so the line landed on the wrong pixels or was clipped away entirely. The same lookup also mis-fit datasets bound to a second horizontal axis
- `fo()` returns `NaN` for horizontal lines instead of `-Infinity`
- The y axis had the same lookup by id (`scales[dataset.yAxisID || 'y']`). A chart whose y axis is named anything but `y` lost its trendline completely, because the default `y` scale it resolved to is unscaled and the line fell outside the chart area

### Testing
- Coverage: 91.78 % → 98.6 % statements, 82.14 % → 93.4 % branches, 88.67 % → 100 % functions (167 → 216 tests)

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