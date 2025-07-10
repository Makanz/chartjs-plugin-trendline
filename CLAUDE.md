# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chart.js plugin that adds linear trendline support to charts. It fits regression models to datasets and draws trendlines over bar, line, and scatter charts.

## Development Commands

- `npm run build` - Build the minified plugin using webpack
- `npm test` - Run Jest tests for all components

## Architecture

The plugin follows a modular structure:

- **Entry Point**: `src/index.js` - Auto-registers plugin globally and exports for manual registration
- **Core**: `src/core/plugin.js` - Main plugin lifecycle integration with Chart.js hooks (`afterDatasetsDraw`, `beforeInit`)
- **Components**: `src/components/` - Rendering logic for trendlines and labels
- **Utilities**: `src/utils/` - Math calculations (`lineFitter.js`) and drawing helpers (`drawing.js`)

## Key Implementation Details

- Plugin integrates with Chart.js v4+ lifecycle using `afterDatasetsDraw` hook
- Trendlines are drawn after datasets to appear on top
- Dataset ordering is handled via `order` property (0-order datasets draw last)
- Configuration is added to datasets via `trendlineLinear` property
- Supports projection mode, custom styling, and labels with legends

## Testing

All components have corresponding `.test.js` files using Jest. Uses `jest-canvas-mock` for Canvas API mocking.

## Coding Standards

- Use modern JavaScript (ES6+)
- 2-space indentation
- JSDoc for public methods (Google style)
- Descriptive naming without abbreviations
- Ensure Chart.js v4+ compatibility

## Chart Type Support

Currently supports: bar, line, scatter charts