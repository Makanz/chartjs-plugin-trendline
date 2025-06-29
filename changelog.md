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