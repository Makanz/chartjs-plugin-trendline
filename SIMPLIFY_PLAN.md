# Code Simplify Plan

Varje cron-run plockar nästa ocheckade punkt, gör en refactoring-branch med tillhörande testuppdateringar, och skapar en PR mot main.

## Kö

- [x] **refactor/label-to-options** — `label.js`: ersätt 11 individuella parametrar med ett options-objekt. Uppdatera `addTrendlineLabel`-signaturen och alla anrop.
- [x] **refactor/drawing-shared-validation** — `drawing.js`: extrahera `validateFiniteCoords` helper från `drawTrendline` och `fillBelowTrendline` för att eliminera duplicerad sanity-check-kod.
- [x] **refactor/plugin-legend-cleanup** — `plugin.js`: förenkla `beforeInit` legend-logiken. Extract:a legend-item-skapande till en egen funktion.
- [x] **refactor/trendline-data-extraction** — `trendline.js`: bryt ut datainsamlingslogiken (forEach-loopen) ur `addFitter` till en egen `collectDataPoints`-funktion.
- [x] **refactor/trendline-projection** — `trendline.js`: bryt ut projection-koordinatberäkningen ur `addFitter` till en egen funktion.
- [x] **refactor/fitter-base-class** — `lineFitter.js` + `exponentialFitter.js`: skapa en gemensam `BaseFitter`-klass för delad caching- och summeringslogik.
- [x] **refactor/index-browser-check** — `index.js`: förenkla browser detection med modernare pattern.
