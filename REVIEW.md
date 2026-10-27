# Review guide — chartjs-plugin-trendline

Read on every review of this repo. `AGENTS.md` says what the project is and how
to build it; this file says what a *bug* is here, and what has to be true before
a change lands.

## What counts as a bug here

- The drawn trendline disagrees with the regression the data implies — wrong
  slope or intercept, or a cached coefficient that survives a new point.
- The trendline is fitted from different points than the dataset the user sees:
  null/NaN entries handled inconsistently, a hidden dataset still drawing
  (unless `alwaysShowTrendline`), filtered or sorted data used differently by the
  fitter than by the chart.
- Projection reaches outside the canvas, or a projection that is switched off
  still extends the line.
- A trendline draws for a dataset with no `trendlineLinear`/`trendlineExponential`
  config, or fails to draw for one that has it.
- **Extra work per animation frame.** `afterDatasetsDraw` runs on every frame; an
  allocation, a full re-fit or a style recomputation added inside it is a bug,
  not a performance nit.
- A legend item appears without `legend` config, duplicates the dataset label, or
  survives `legend.display: false`.
- The canvas accessibility description no longer matches what is drawn.

Anything else is at most a nit.

## Never merge without

- `pnpm test` — the suite pins the draw hook, the fitters, the label component
  and the accessibility path. Quote the pass count; a new failing test is the
  review, not a note.
- `pnpm run build` with the rebuilt `dist/` **committed**, whenever a change under
  `src/` alters emitted output. The pages in `example/*.html` load `dist/`, so an
  unbuilt dist means the manual visual check is looking at old code. (`release.yml`
  rebuilds from source, so this affects the repo's examples and anyone consuming
  the committed dist — not the npm publish.)
- For a rendering change: open the affected `example/*.html` and look at the line.
  There is no automated visual test; this is the only check that catches "draws
  correctly".

## Always flagged

- `.github/workflows/release.yml` — publishes to npm on a tag. A human reads it.
- `.github/workflows/tests.yml` — the only automated gate. Breaking it silently
  removes every other check.
- `package.json` version and `changelog.md` — move together. The release fails on
  a version/tag mismatch, so a version bump without a changelog entry ships
  undocumented.
- `dist/` — never hand-edited. Only `pnpm run build` writes it.
- `package-lock.json` and `pnpm-lock.yaml` — both are tracked; the release installs
  with pnpm `--frozen-lockfile`, so a dependency change has to reach both.

## Skip

- `node_modules/`, `coverage/`, `dist/*.map`

## Finding rules

- At most five nits per review; the rest waits for a follow-up.
- Every finding cites a file and a line.
- Tag each finding **Important**, **Nit** or **Pre-existing**.
- "Nothing to fix" is a valid and wanted answer.
