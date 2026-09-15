# Visual review

## How to capture

```bash
npm run build
npm run preview            # serves dist/ (note the printed port)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1440,1200 --virtual-time-budget=9000 \
  --screenshot=/tmp/home.png "http://localhost:4173/"
```

For authenticated routes (dashboard, drug calculator, infusions, formulary
review) the real routes require sign-in, so render a standalone preview page that
links the built stylesheet and reproduces the route markup. This is a review aid
only — it is not the shipped HTML.

## Routes reviewed

| Route | Width | Notes |
|---|---|---|
| Public Home | 1440 | warm ivory canvas, coral primary action, growth motif |
| Login | 1440 | split auth layout, coral/teal accents |
| Onboarding | 1440 / 430 | stepper, safety orientation, error state |
| Dashboard | 1440 | navy→teal hero, growth motif, launch cards |
| Drugs & Scores | 1440 | mode tabs, drug picker + result card, catalog rows |
| High-Risk Infusions | 1440 | list/detail, gradient result panel, two-step sign-off |
| Patient form | 1440 / 430 | error summary + field errors |
| Formulary review (Teddy Bear / Neonate) | 1440 | source header, review fields, filters |

## Before any global CSS change

Re-run `npm run build && npm run report:bundle`, then re-capture the routes
above at 1440 px and at 390 px. The highest-risk screens are the dashboard,
drug calculator, high-risk infusions, and both formulary review pages.

Institution-dependent: an automated visual-regression service (or a scripted
axe/Lighthouse pass) should be wired into CI before production.
