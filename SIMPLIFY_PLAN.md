# Code Simplify Plan

Varje cron-run plockar nästa ocheckade punkt, gör en refactoring-branch med tillhörande testuppdateringar, och skapar en PR mot main.

## Kö

- [x] **refactor/label-to-options** — `label.js`: ersätt 11 individuella parametrar med ett options-objekt. Uppdatera `addTrendlineLabel`-signaturen och alla anrop.
- [ ] **refactor/drawing-shared-validation** — `drawing.js`: extrahera `validateFiniteCoords` helper från `drawTrendline` och `fillBelowTrendline` för att eliminera duplicerad sanity-check-kod.
- [ ] **refactor/plugin-legend-cleanup** — `plugin.js`: förenkla `beforeInit` legend-logiken. Extract:a legend-item-skapande till en egen funktion.
- [ ] **refactor/trendline-data-extraction** — `trendline.js`: bryt ut datainsamlingslogiken (forEach-loopen) ur `addFitter` till en egen `collectDataPoints`-funktion.
- [ ] **refactor/trendline-projection** — `trendline.js`: bryt ut projection-koordinatberäkningen ur `addFitter` till en egen funktion.
- [ ] **refactor/fitter-base-class** — `lineFitter.js` + `exponentialFitter.js`: skapa en gemensam basklass för delad caching- och summeringslogik.
- [ ] **refactor/index-browser-check** — `index.js`: förenkla browser detection med modernare pattern.
