# Prakash Pediatrics — Design System

The interface blends two reference languages: the **warm, human, rounded**
visual system of *Kapoori Ka* (parchment canvas, terracotta action colour,
bold editorial type, pill actions, generous whitespace) with the **clinical
trust** language of the *Rainbow Child Development Clinic* appointment product
(deep-navy trust surfaces, teal healthcare action, coral pediatric accent,
growth-chart motif). The result should feel **calm, warm, and quietly
trustworthy** — never a generic SaaS dashboard.

## Principles

> One clear action, one calm message, one familiar cue at a time.

- Warm neutrals carry the page; colour is reserved for meaning.
- One primary action per region.
- Generous touch targets (≥ 44 × 44 px) and visible focus states.
- Icons are always paired with text.
- Status is never communicated by colour alone — pair it with an icon and label.
- Clinical safety language (pending verification, oversight) stays visible.

## Colour

| Token | Hex | Role |
|---|---|---|
| `--navy` | `#16324a` | Trust surface (sidebar, dark panels) |
| `--navy-deep` | `#0f2537` | Sidebar gradient end |
| `--teal` | `#0f8f8a` | Healthcare action, links, selected states |
| `--coral` | `#e8602c` | Warm primary action, eyebrows, active state |
| `--gold` | `#f5a623` | Highlights, warm accents |
| `--pine` | `#3d8b5e` | Positive / reassuring |
| `--bg` | `#f7f4ee` | Warm ivory canvas |
| `--bg-card` | `#fffdfa` | Warm card surface |
| `--border` | `#ece2d6` | Warm quiet separation |
| `--text` | `#22303d` | Primary text |
| `--text-secondary` | `#6a6157` | Secondary text |
| `--muted` | `#948b80` | Metadata |
| `--green/amber/red` | status | Factual states only |

## Type

`DM Serif Display` for editorial headings, `DM Sans` for UI/body.
Headings use a strong weight and tight leading; metadata is small, uppercase,
and letter-spaced (`.eyebrow`, coral).

## Shape & depth

- Radii: control `10px`, card `16px`, large panel `22px`, pill `999px`.
- Primary/secondary/ghost buttons and badges are **pill** shaped.
- Shadows are warm and low-opacity (`rgba(80,56,32,…)`), never hard grey.

## Spacing

4 px base; 8 px increments for layout. Card padding `20–22px`, section gaps
`16–24px`, page padding `24px`.

## Signature motif

A **growth-chart curve with milestone markers** (from the pediatric appointment
reference) is used sparingly — hero/illustration accents, empty states, and
progress — to communicate development and continuity of care without implying a
diagnosis or percentile.

## Responsive

Test at 320 / 360 / 390 / 430 px. Stack single-column on narrow widths,
full-width buttons, never depend on hover for essential information.
