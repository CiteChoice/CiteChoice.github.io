# CiteChoice project page

Source for **https://citechoice.github.io**, the interactive companion to

> Sriram Selvam and Anneswa Ghosh. *CITECHOICE: A Causal Audit of How Document
> Presentation Redistributes Citation Credit in Agentic Search.*
> arXiv:2609.15164, 2026.

It is a static site: plain HTML, CSS and JavaScript, no build step and no
third-party scripts. Fonts come from Google Fonts.

## What's on the page

| Section | What it does |
| --- | --- |
| Hero | Replays a real pair (two State Department pages) under prose and structured target renderings |
| Walkthrough | Steps one real record through all eight pipeline stages, from the live search to the alignment audit |
| Replay lab | The 2×2 (rendering × pair order) for three featured pairs, or any of the 113 |
| Findings | Effect charts, a live family bootstrap and sign-flip test on the real family effects, rank deflation, the regeneration noise grid, a power projection, and the word-preserving ablation |
| Explorer | All 113 pairs and 452 trials as 2×2 glyphs, with search, filters and per-pair detail |
| Protocol | Estimands, guarantees and the eight prompts verbatim with their SHA-256 |

## Layout

```
index.html               page content
assets/css/site.css      design tokens (light and dark) and components
assets/js/core.js        shared helpers: DOM, statistics, tooltip, theme, nav
assets/js/hero.js        hero replay card
assets/js/walkthrough.js eight-stage walkthrough
assets/js/lab.js         2x2 replay lab
assets/js/findings.js    charts, stats lab, noise grid, power projection, ablation
assets/js/explorer.js    pair explorer and prompt catalogue
assets/js/data.js        generated: derived per-trial records (see below)
assets/js/prompts.js     generated: the eight prompts, verbatim
assets/img/              favicon and social preview image
tools/                   scripts that regenerate data.js and prompts.js
```

## Data

`assets/js/data.js` is generated from the archived scaled-wave runs in the
CiteChoice research repository and contains only derived records:

- target and competitor citation counts and total citation markers for all 452
  replay trials (113 pairs × 4 cells), plus the 120-cell regeneration run;
- per-pair metadata: query, topic, phrasing, answer-target family, page titles,
  domains and original positions, and the human-audit verdict;
- for three featured pairs whose pages are U.S. government publications
  (travel.state.gov, cbp.gov, the e-CFR), the treatment renderings and short
  answer excerpts.

No archived third-party page text or raw provider traces are included.
Headline statistics on the page are quoted from the paper; the stats lab
recomputes the bootstrap intervals and sign-flip p-values in the browser from
the family effects and lands within Monte Carlo error of the reported values.

To regenerate after the archive changes:

```bash
python3 tools/build_site_data.py /path/to/CiteChoice assets/js/data.js
python3 tools/build_prompts.py  /path/to/CiteChoice assets/js/prompts.js
```

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk also works; no fetches are made.

## Publishing

In the repository settings, open **Pages**, choose **Deploy from a branch**, and
select the branch that holds this site with the `/ (root)` folder. The empty
`.nojekyll` file tells Pages to serve the files as they are.
