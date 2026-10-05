---
name: Paragon
description: One cross-platform trophy hunter profile, lit like a trophy room at night.
colors:
  background: "#0a0d13"
  surface: "#10151f"
  surface-2: "#1b2330"
  border: "#212a38"
  foreground: "#e9eef7"
  muted: "#a7b0c0"
  accent: "rgb(124 196 228)"
  accent-2: "#d7eef8"
  accent-light: "rgb(22 110 150)"
  accent-blue: "rgb(74 158 255)"
  accent-laton: "rgb(201 162 74)"
  accent-carreras: "rgb(255 106 0)"
  accent-carreras-2: "#e8ff3a"
  accent-salidas: "rgb(255 207 58)"
  accent-datos: "rgb(240 244 250)"
  accent-fosforo: "rgb(51 255 102)"
  accent-inmersion: "rgb(63 208 224)"
  good: "#4ec98a"
  danger: "#ff6b6b"
  bronze: "#c07b4a"
  silver: "#b9c2cc"
  gold: "#e2b53e"
  platinum: "#9fd4ec"
  light-background: "#f4f6fa"
  light-surface: "#ffffff"
  flap-amber: "#ffcf3a"
  flap-amber-light: "#a16207"
  flap-tile: "#1c2028"
  spine-ink: "#f4f6fa"
  brand-playstation: "#0070d1"
  brand-xbox: "#107c10"
  brand-steam: "#1b2838"
  brand-epic: "#2a2a2a"
typography:
  display:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.5rem, 9vw, 5rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  page-title:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 700
    lineHeight: 1.05
  section-headline:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  title-sm:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.01em"
  numeral:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  rank-numeral:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-md:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.35
  body-ui:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  body-sm:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
  label-sm:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.1em"
  micro:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.05em"
rounded:
  xs: "4px"
  md: "6px"
  lg: "8px"
  btn: "10px"
  xl: "12px"
  board: "14px"
  2xl: "16px"
  card: "18px"
  tile: "20px"
  holo: "22px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  cabina-gap: "24px"
  lg: "28px"
  casa-gap: "48px"
  section: "80px"
  section-wide: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.background}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "12px 28px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  nav-link:
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "6px 14px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.tile}"
    padding: "24px"
  panel-feature:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.3xl}"
    padding: "28px"
  chip-accent:
    backgroundColor: "rgb(124 196 228 / 0.14)"
    textColor: "{colors.accent-2}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip-example:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  tag-micro:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted}"
    typography: "{typography.micro}"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  progress-track:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.full}"
    height: "4px"
  dorsal:
    typography: "{typography.title}"
    padding: "4px 10px"
  dorsal-large:
    padding: "7px 16px"
    width: "72px"
  toast-trophy:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "12px 8px 12px 12px"
    width: "384px"
  holo-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.holo}"
    padding: "16px 20px 20px"
    width: "300px"
  guide-list:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.board}"
  guide-check:
    rounded: "{rounded.xs}"
    size: "20px"
  box-spine:
    textColor: "{colors.spine-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    width: "52px"
  box-shelf:
    backgroundColor: "{colors.surface-2}"
    height: "8px"
  rank-row:
    typography: "{typography.rank-numeral}"
    padding: "14px 8px"
  departures-board:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.board}"
  flap-tile:
    backgroundColor: "{colors.flap-tile}"
    textColor: "{colors.flap-amber}"
    typography: "{typography.body-sm}"
    rounded: "3px"
    width: "1.05rem"
    height: "1.55rem"
  scoreboard-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.board}"
    padding: "24px"
  scoreboard-row:
    padding: "14px 24px"
  cabina-edit:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.tile}"
    padding: "16px 20px"
  settings-nav-link:
    textColor: "{colors.muted}"
    typography: "{typography.body-ui}"
    padding: "8px 14px"
  matrix-point:
    rounded: "7px"
    size: "26px"
  platform-tile:
    textColor: "{colors.light-surface}"
    rounded: "{rounded.xl}"
    padding: "16px 12px"
  casa-button:
    backgroundColor: "{colors.light-surface}"
    textColor: "#0b0b0b"
    typography: "{typography.body-ui}"
    rounded: "{rounded.full}"
    padding: "10px 24px"
---

# Design System: Paragon

## Overview

**Creative North Star: "The Night Trophy Room"**

Paragon is a trophy room with the lights down: a deep navy-black floor (#0a0d13), surfaces one step up, and the only strong light falling on the things a hunter earned. The brand accent is platinum itself, the colour of the trophy being chased, so the interface glows in the same pale ice-blue the platinum trophy does. Everything else stays quiet: muted blue-grey text, hairline borders, flat tonal cards. Light is used as a material, not as decoration: a soft halo leaks from the top-left of every page, the landing's vitrine lights each trophy from above, and hovering anything clickable makes it glow in the accent.

The system is built on three independent axes that the user controls: **mode** (dark default, light, OLED, high contrast), **accent** (platinum default, plus blue, violet, red, green, orange, six full palettes, a palette taken from a chosen game's cover, and a free colour), and **style** (Classic default, plus Terminal, Glass, Brutalist, PS5, Xbox, Steam, Switch), which rewrites corner radius, shadow, type and page backdrop across every existing component. Every component must therefore be written against tokens, never against literal colours, so the three axes can repaint it without a code change.

Since the October 2026 redesign each section of the platform carries its own **room metaphor**, all built on the same tokens: the profile is a holographic collectible card, a game's trophy list is a strategy guide, the library is a shelf of box spines, statistics lead with a heat calendar, Discover is a difficulty-by-hours matrix plus a music-chart "hit list", the community is a wall of achievements, the dashboard is a cockpit of bolted-in instruments, friends are a stadium scoreboard, news is a departures board with a wire ticker, settings are a refined control panel, and each platform page lives "in its own house". A metaphor shapes composition and one signature detail; it never brings its own palette, except where noted (platform houses, the split-flap amber).

Density is medium: a hunter's dashboard is data-rich, so type is compact (13px secondary text is common) while hero moments go large, condensed and uppercase. Numbers are the heroes: counts, levels, ranks and trophies-remaining are set big in the display face, often in platinum or the accent.

**Key Characteristics:**
- Night navy base with tonal layering (background, surface, surface-2) instead of heavy shadows.
- Platinum accent, derived everywhere from one RGB channel variable.
- Chakra Petch (condensed, technical) for headings and numerals; Barlow for everything read.
- Trophy grade colours (bronze, silver, gold, platinum) are semantic: grade and rank, never decoration.
- Every clickable glows on hover, enforced globally, except list rows inside a card.
- User-selectable mode, accent and style axes; components stay token-bound so all three work.
- One room metaphor per section, expressed through composition and a single signature detail.
- Competition pages (Ligas, Clanes) wear a scoped race-timing world; platform pages wear their platform's house palette.

## Colors

A cool, near-monochrome night palette in which platinum is the single brand light and the four trophy metals are reserved meanings.

### Primary
- **Platinum Ice** (`accent`): the brand accent since the platinum rebrand. Declared as a bare RGB channel (`--accent-rgb: 124 196 228`) so every tint derives from it: pill backgrounds at 14% (`--accent-soft`), pill and card borders at 32–35% (`--accent-line`), glows at 45–50% (`--accent-glow`, the global hover drop-shadow). Primary buttons fill with the vertical brand gradient (`--accent-grad`, 160deg from accent-2 to accent); progress bars use the horizontal one (`--accent-grad-h`).
- **Frost Highlight** (`accent-2`): the light end of the brand gradient, the pale top of the level ring, and the colour the holo card's gradient frame passes through.
- **Accent text** (`--accent-text`): not a separate hue but the accent mixed 55% with white on dark (75% with black in light mode, 30% with white in high contrast). Use it for any accent-coloured text, links, percentages, LED figures and scoreboard rotulos; raw `accent` is for fills and strokes.
- **Steel Platinum** (`accent-light`): the accent in light mode. Pastel ice-blue washes out on white, so light mode swaps the channel to a saturated blue steel.
- **Legacy Blue** (`accent-blue`): the previous brand blue, kept as the `.accent-blue` preset. Each preset has a stronger light-mode variant.

### Full palettes (accent axis)
Six presets on the same accent axis that, in dark mode only, also repaint the ground. Each sets `--accent-rgb` and `--accent-2`; the `.dark.accent-*` rule additionally replaces `--background`, `--surface`, `--surface-2` and `--border`. Light, OLED and high contrast keep their own grounds and take only a darker light-mode accent (`.light.accent-*`), because those modes exist for a reason the palette must not override. Platinum stays the default.
- **Service Brass** (`accent-laton`, "Hoja de servicio"): brass on a deep navy ground (#0b1120 / #121b2e / #1b2740 / #26334d); `accent-2` #f0dc9c. Light: rgb(146 110 30).
- **Race Orange** (`accent-carreras`, "Liga de carreras"): safety orange with acid yellow (`accent-carreras-2`) as the gradient's light end, on graphite (#121416 / #1a1d21 / #24282d / #30353c). Light: rgb(214 80 0).
- **Departure Amber** (`accent-salidas`, "Panel de salidas"): split-flap amber on near-black (#0a0c10 / #13161c / #1d2129 / #2a303a); `accent-2` #fff1b8. Light: rgb(161 118 0).
- **Data White** (`accent-datos`, "Datos"): a near-white accent on pure black (#000000 / #0b0b0b / #171717 / #2e2e2e) with `muted` lifted to #b4b4b4; `accent-2` #ffffff. Light: rgb(17 17 17). Text on its fills is still `background`, so the Dark Text on Light Rule holds.
- **Phosphor** (`accent-fosforo`, "Fósforo"): terminal green on green-black (#020a04 / #07140a / #0e2013 / #173420); `accent-2` #c8ffd6. Light: rgb(10 140 50).
- **Immersion Cyan** (`accent-inmersion`, "Inmersión"): cyan on deep ocean (#04121f / #0a1c2e / #11283f / #1b3753); `accent-2` #c9f3f8. Light: rgb(8 128 150).

The picker swatch for a full palette is split diagonally, half ground and half accent (`linear-gradient(135deg, ground 50%, accent 50%)`), so the user sees both halves of what they are choosing.

### Palette from your game (accent axis)
A seventh full palette computed, not authored: in Appearance the user picks a game and the app is tinted with the dominant colour of its cover (`games.auraColor`). `lib/paletaJuego.ts` derives the whole palette from that one hue and writes it as `--juego-*` variables on `<html>`; the `.accent-juego` class maps them onto the same slots as any full palette (accent and `accent-2` everywhere, the four ground tokens only in `.dark`, a separate darker accent in `.light`).
- **Ground:** the cover's hue at very low light: background at 5.5% lightness, surface 8.5%, surface-2 13%, border 19%, saturation capped at 30%.
- **Accent:** greys stay grey (saturation under 12% is kept, because that is the cover's real colour); dull colours are lifted to at least 55% saturation so the accent reads as an accent.
- **Contrast correction:** the dark-mode accent is lightened until it reaches **5:1** against the palette's surface; the light-mode accent is darkened until it reaches 5:1 against white. `accent-2` is the same hue at 86%+ lightness.

### Platform houses (scoped grounds)
Each platform page in Discover (`/descubrir/playstation`, `/xbox`, `/steam`, `/epic`) wraps its whole content in a house that **redefines the theme tokens locally** (`--background`, `--surface`, `--surface-2`, `--border`, `--foreground`, `--muted`, `--accent-rgb`, `--accent-2`, and the derived `--accent-*` set recomputed inside the house), so every component inside (rankings, covers, news, releases) repaints without being touched. Houses are always dark, regardless of the user's mode.
- **PlayStation:** midnight blue ground (#071226 / #0d1d3a / #15294f / #20376a), PlayStation blue accent (0 112 209), `accent-2` #6db3ff.
- **Xbox:** charcoal (#0e0f0e / #181a18 / #232623 / #2f332f), Xbox green accent (16 124 16) with a brighter green accent text (#6be05a), `accent-2` #5edc4a.
- **Steam:** Steam's slate (#1b2838 ground, #16202d surface, #2a475e surface-2, #2f4a63 border), sky accent (102 192 244); muted #8f98a0.
- **Epic:** near-black (#101014 / #18181c / #26262c / #303036), white foreground, cyan accent (38 187 255).
The house bleeds to the viewport edges with a 100vmax `box-shadow` in its own background plus `clip-path: inset(0 -100vmax)`, never `100vw` (which adds a horizontal scrollbar on Windows).

### Platform brand marks
- **Brand tiles** (`brand-playstation`, `brand-xbox`, `brand-steam`, `brand-epic`): the Discover platform access tiles fill with a 150deg gradient from the brand colour to the brand colour mixed 55% with black, white text, and the platform logo forced to white (`filter: brightness(0) invert(1)`). Logos are colour SVGs; on any brand fill they go white. Only platforms that actually sync get a tile.
- The landing's convergence columns use their own platform hues (PlayStation #2f7ad6, Steam #66c0f4, Xbox #16a316, Epic #c9ced6), tuned to read as accents on the night floor rather than as fills.

### Livery (Ligas and Clanes only)
A fixed list of ten plate/ink pairs in `src/lib/librea.ts` (orange #ff6a00, acid #e8ff3a, cyan #00b8ff, rose #ff2d55, green #35e36b, violet #b46bff, yellow #ffd60a, paper #f4f6fa, platinum #7cc4e4, red #ff3b30, each with an ink chosen to read on it). A hunter's or clan's livery is picked deterministically by an FNV hash of the user id or upper-cased clan tag, so the same competitor wears the same colours in every standings table. Livery colours are identity marks, not accents: they never tint anything outside the Carreras world (see Components).

### Tertiary (trophy grades)
- **Platinum** (`platinum`), **Gold** (`gold`), **Silver** (`silver`), **Bronze** (`bronze`): the four trophy metals. They colour trophy icons, grade-specific rarity figures, platinum counts, the stripe and percentage of each box spine (the game's best grade), the podium of every ranked list (1 gold, 2 silver, 3 bronze), the scoreboard's first place, and the first-place hunter's card (gold tint at 8% fill, 45% border).
- **Metal ladder:** the statistics heat calendar (large variant) fills its four intensity levels bronze → silver → gold → platinum, so a busier day reads as a higher grade.

### Semantic
- **Signal Green** (`good`): live and positive states: the "playing now" dot, the trust checkmarks under the landing CTAs, success, a release that has already arrived on the departures board.
- **Alarm Coral** (`danger`): errors, destructive actions, and the italic "missable" note in the strategy guide's margin.
- **Flap Amber** (`flap-amber`): the letters of the departures board's split-flap date tiles, the ticker's time stamp and the "coming soon" status (under 30 days). In light mode the text uses (`flap-amber-light`); the flap tiles themselves stay dark in every mode (`flap-tile`, with a #0b0d11 hinge line at the middle and #171a21 lower half).

### Neutral
- **Night Floor** (`background`): the page. Always painted with the accent halo `radial-gradient(1200px 600px at 15% -10%, var(--glow), var(--background) 60%)` fixed to the viewport.
- **Vitrine** (`surface`): cards, panels, the header, list-row hover fills in the hit list.
- **Shelf** (`surface-2`): nested fills, progress tracks, empty image slots, hover fill for list rows and secondary buttons.
- **Hairline** (`border`): 1px borders on every card and input; dividers between grouped settings and ranked rows; also the scrollbar thumb.
- **Moonlight** (`foreground`): primary text.
- **Dusk Grey** (`muted`): metadata, dates, descriptions, column headers. Raised from #8794a8 for contrast because it carries functional text.
- **Paper** (`light-background`, `light-surface`): light mode's page and card; OLED swaps to pure black (#000000) with surfaces #0a0a0c / #141418; high contrast brightens borders to #5a6b82 and text to #ffffff.
- **Spine ink** (`spine-ink`): the fixed near-white title on a box spine, which always sits on its own darkened cover art.

### Named Rules
**The One Channel Rule.** Every accent tint is `rgb(var(--accent-rgb) / alpha)` or one of the derived `--accent-*` variables. A literal `rgba(124,196,228,…)` breaks every other accent and every other mode.

**The Metals Mean Grade Rule.** Bronze, silver, gold and platinum are only for trophy grade and rank (podiums, first place, a game's best grade) and the heat calendar's metal ladder, which counts trophies. Platinum is also the brand accent's namesake, but the `platinum` token (#9fd4ec) stays fixed across accents because it represents the trophy, not the brand.

**The Dark Text on Light Rule.** Text on an accent fill is `background` (dark), never white. Accent presets, and the game palette's contrast correction, are chosen so that pairing reads.

**The Ground Belongs to the Mode Rule.** A palette may repaint the ground only in dark mode. Light, OLED and high contrast keep their grounds under every accent; a new full palette adds a `.dark.accent-x` ground block and a `.light.accent-x` darker accent, never a ground rule for the other modes. The game palette follows the same split.

**The Theme Scrim Rule.** Image scrims fade to the theme ground (`from-background`), and text over covers uses `foreground`. A literal #0a0d13 scrim or white text over a cover breaks light mode and every full palette. Two scoped exceptions: inside a platform house (always dark), hero art takes a black veil and white text; and a physical object that carries its own art (a box spine) keeps a fixed dark veil and `spine-ink`.

**The Brand Lives at Home Rule.** Platform brand colours appear only in platform-identity contexts: the platform houses, the Discover platform tiles, platform logo tiles and the landing's convergence columns. They never tint generic UI.

**The Board Follows the Theme Rule.** The scoreboard and the departures board are built from the theme's own ground (surface and background darkened with black, a 4px inset ring and a dotted lamp grid) and its accent; they are not fixed-colour islands. The only fixed colour they keep is the flap amber, and only on the flap letters, the ticker time and the soon status.

## Typography

**Display Font:** Chakra Petch (500, 600, 700), falling back to Barlow
**Body Font:** Barlow (400–700), falling back to ui-sans-serif, system-ui
**Label/Mono Font:** JetBrains Mono, used only when the user picks the Terminal style (it replaces both families)

**Character:** Chakra Petch is squared-off and technical, a scoreboard or console-UI voice; set uppercase and tight it reads as a trophy plate. Barlow is a slightly condensed grotesque that stays readable at the small sizes a data-heavy dashboard needs.

### Hierarchy
- **Display** (700, `clamp(2.5rem, 9vw, 5rem)`, 0.95, −0.025em, uppercase): the landing hero only; one phrase of the headline can switch to `platinum`. Caps at about 20ch.
- **Headline** (700, `clamp(1.875rem, 5vw, 2.75rem)`, 1.05, −0.015em, uppercase): landing section titles.
- **Page title** (700, 2.625rem, uppercase): app page titles; smaller pages use the fluid `clamp(1.75rem, 5vw, 2.5rem)` or `clamp(2rem, 6vw, 2.625rem)`.
- **Section headline** (700, `clamp(1.5rem, 4vw, 2.25rem)`, uppercase, leading tight): the protagonist section of a redesigned page (the heat calendar, the difficulty matrix). Ordinary in-app section headings drop to 1.5rem (`text-2xl`), sentence case.
- **Title** (700, 1.125–1.25rem, tight): card titles, game names, step titles, trophy-guide chapter headings (uppercase, wide tracking, over a 2px border).
- **Title small** (700, 1.0625rem, 0.01em): settings group headings and compact card titles.
- **Numeral** (700, 1.875–6rem, line-height 0.8–1, tabular figures): levels, counts, trophies remaining. Often `platinum`. The dashboard's platinum count runs 4.5rem on mobile and 5.5rem from `sm`, lit with a 40px accent text glow.
- **Rank numeral** (700, 3.25rem, 0.85, −0.04em, tabular): the hit list's position numbers, set as **outline only** (transparent fill, 1.5px stroke at 45% foreground). Variants: 2.25rem with 1.25px stroke (platform rankings) and 1.75rem with 1px stroke (new entries). The podium fills and strokes in its metal; hover turns the stroke to `accent-text`. A hero slide's position goes to `clamp(6rem, 16vw, 11rem)` with a 2px white stroke at 22%.
- **Body** (400, 1rem, 1.625, `muted` for descriptions): paragraphs cap at 60ch; step bodies at 52ch; settings help text at 62ch.
- **Body medium** (700, 0.9375rem): primary button text, cartel and toast trophy names, emphasised row titles. The commonest off-Tailwind size after the labels.
- **Body UI** (600, 0.875rem): inputs, settings navigation links, the house button.
- **Body small** (600, 0.8125rem): list rows, nav links (with 0.04em tracking), game titles in rows, box-spine titles (uppercase, 0.04em), flap letters, the ticker's time.
- **Caption** (400–600, 0.75rem): secondary lines in rows (game under a trophy, "rarity · hours"), departures status (uppercase, 0.08em).
- **Label** (600–700, 0.6875rem): chips, metadata, rarity figures, the missable note, settings group labels and preview label (uppercase, 0.12em).
- **Label small** (700, 0.625rem, uppercase, 0.1–0.12em): table column headers on boards and scoreboards, stat captions under figures, heat-calendar axis labels, the "you" tag, box-spine percentages.
- **Micro** (700, 0.5625rem, uppercase, about 0.05em): genre and platform tags on release cards and posters, small title badges, month ticks on compact charts. The floor of the scale: nothing goes smaller.

### Named Rules
**The Headings Wear the Plate Rule.** `h1`, `h2`, `h3` and `.font-heading` always use the display face (set globally). Numerals that matter use it too, with `tabular-nums`. The only exception is inside a platform house, where headings evoke the platform's own voice: PlayStation in Barlow 300 (loaded for this), no uppercase, Steam's section headings in Barlow 600 at 0.9375rem with 0.08em tracking, Epic in Barlow 700 sentence case.

**The rem-Only Rule.** Text sizes are in rem, never px: the user's text-size setting (87.5–125%) scales the root, and px sizes ignore it. Off-Tailwind sizes are limited to the steps in the frontmatter (0.5625, 0.625, 0.6875, 0.8125, 0.9375, 1.0625, 2.625rem and the component numerals); do not invent new in-between steps.

**The LED Is for Numbers Rule.** The scoreboard's dot-matrix LED treatment (a 3px radial mask that turns the stroke into lamps, plus a 12px glow) applies only to figures. Names and labels stay in plain type, because masked letters stop being legible.

**The Subtitle Below Rule.** A heading carries no small label above it. Context that used to sit over a title (the dashboard's section labels) goes below it as a muted subtitle.

**The Solid Headline Rule.** Headlines are solid colour. Gradient text is not used anywhere in the app; the `text-gradient` utility still exists in `globals.css` but must not be reached for. (The profile name effect is a user-chosen cosmetic, not a headline style.)

## Layout

A centred container of max 1240px with 16px gutters on mobile and 28px from `sm` up; the sticky header is 64px tall. Landing sections breathe on an 80px rhythm (`pt-20`), 96px from `sm` (`pt-24`); in-app pages stack sections at about 36px (`space-y-9`). Card interiors pad 16–24px (20–28px on feature panels); grid gaps are mostly 12px (`gap-3`), 10px on dense stat rows.

Responsive grammar is Tailwind's: `sm` 640px and `lg` 1024px do most of the work; `md` 768px switches the settings menu to a sidebar, the community wall to two columns and boards to their full table; `xl` 1280px is where the settings preview fits beside the options. Two custom steps exist: 900px for the hit list's two columns and Steam's capsule split. Grids go 2 columns on mobile, 3 at `sm`, 4–5 at `lg`; asymmetric two-column splits at `lg` use fractional tracks (`1.1fr 0.9fr`, `1.4fr 1fr 1fr 1fr`, `1fr 320px` for the matrix and its list). An odd last item in a 2-column mobile grid spans both columns rather than leaving a hole; vitrine rows render only complete rows.

### Section compositions
- **Cockpit (dashboard):** a 12-column grid at `lg` (one column below; 20px gap, 24px from `lg`). The next-platinum module spans 8 with a 4-column stack of two modules beside it; pairs of half-width modules fall back to full width when one is hidden; the "edit panel" footer spans 12. No tabs and no drag.
- **Hit list (Discover):** the community top flows in two columns from 900px, column-first (`grid-auto-flow: column` with the row count as `--filas`), rows divided by hairlines instead of cards. New entries and gems go 1/2/3 columns.
- **Platform house:** the body is two columns from `lg` (`7fr` own content | `5fr` rankings, 48px row gap, 40px column gap), one column when there are no rankings; releases always run full width below both columns.
- **Settings:** horizontal scrolling strip of links on mobile; fixed sidebar by groups from `md`. Option pages with a preview become `1fr 17rem` from 1280px with the preview sticky at 6rem; below that the preview is hidden because the page itself already applies changes live.
- **Community wall:** CSS columns (1, then 2 from `md`) with 1rem gaps; cards never break across columns.
- **Scoreboard and departures board:** a single grid per row; on mobile figures fold under the name (4 equal columns) and the date tiles take their own line; the header row appears only from `sm` / `md`.

### Named Rules
**The min-w-0 Rule.** Any grid or flex child that can contain truncating text gets `min-w-0`. A `1fr` or `auto` track defaults to min-content width, so a long title silently widens the column and breaks the grid instead of truncating.

**The Bleed-for-Glow Rule.** A horizontally scrolling or marquee row is wrapped as `-mx-4 px-4` (negative margin plus matching padding) so the hover glow and lift of its children have room and are not clipped by the row's `overflow-hidden`. Edge fades are 64px gradients from `background` to transparent.

**The Clip Inside Rule.** Never put `overflow: hidden` on the element that owns a hover shadow or drop-shadow glow; clip an inner layer instead.

**The Unlayered CSS Wins Rule.** Component CSS in `globals.css` sits outside `@layer`, so it beats any Tailwind utility on the same element: a `.marcador-fila { display: grid }` overrides a `hidden` class. To hide or change display per breakpoint on an element that has a `globals.css` display rule, do it in that CSS with a media query, never with utilities.

## Elevation & Depth

Depth is mostly tonal: background, surface and surface-2 step up in lightness, and every card carries a 1px `border`. Shadows are reserved for three jobs: a soft, deep drop under hero objects (feature panels, the Paragon card, the holo card, primary buttons), the accent glow that answers hover, and the inset bezel of instrument-like boards. The page itself has depth from the fixed accent halo. The style axis can override all shadows globally (Terminal removes them, Glass diffuses them, Brutalist makes them hard and offset, console styles tint them).

### Shadow Vocabulary
- **Hover glow** (`filter: drop-shadow(0 0 12px rgb(var(--accent-rgb) / 0.5))`): applied globally to every enabled button, rounded link and `cursor-pointer` element on hover.
- **Accent lift** (`box-shadow: 0 14px 32px -12px rgb(var(--accent-rgb) / 0.7)`): under primary gradient buttons.
- **Paragon aura** (`box-shadow: 0 28px 60px -24px rgb(var(--accent-rgb) / 0.45), inset 0 2px 0 rgb(255 255 255 / 0.03)`): the unified profile card.
- **Holo aura** (`box-shadow: 0 30px 60px -28px rgb(var(--accent-rgb) / 0.55), 0 12px 24px -12px rgb(0 0 0 / 0.6)`): the profile's holographic card.
- **Panel drop** (`box-shadow: 0 24px 50px -28px rgb(0 0 0 / 0.6)`): neutral feature panels such as the route card.
- **Board bezel** (`box-shadow: inset 0 0 0 4px <background darkened 30% with black>, inset 0 0 0 5px var(--border), 0 18px 40px -24px rgb(0 0 0 / 0.8)`): the scoreboard and departures board; in light mode the 4px ring is `surface` and the drop softens to 25% black.
- **Card hover drop** (`box-shadow: 0 30px 60px -15px rgba(0,0,0,0.8)`): game cards on hover, together with tilt.
- **Spine lift** (`box-shadow: 0 14px 22px -10px var(--metal)`): a box spine pulled from the shelf glows in its grade metal.

### Named Rules
**The Light Answers Touch Rule.** Surfaces are flat at rest; the accent glow appears only in response to hover or as the aura of a single hero object per view.

## Shapes

Softly rounded, never pill-shaped containers. The scale in use: 4px (`xs`) for checkboxes, spine tops and small covers; 6px (`md`) for thumbnails and ticker photos; 8px (`lg`) for inputs, nav links and small icon tiles; 10px for compact buttons; 12px (`xl`) for main buttons, list rows and platform tiles, the most common radius; 14px (`board`) for the strategy guide list, the scoreboard and the departures board; 16px (`2xl`) for landing columns, hunter cards and the matrix plane; 18–20px for app cards, stat tiles and the cockpit footer; 22px (`holo`) for the holo card; 24px (`3xl`) for landing feature panels; full rounding only for chips, avatars, status dots, progress bars, step numbers and the house button. Borders are 1px `border`, 2px only for step markers, guide checkboxes, chapter rules and avatar rings; dashed 1px for guide rows and the cockpit's edit footer. Platform and trophy icons sit in small rounded-square tiles tinted at 18–22% of their own colour.

The style axis overrides radius globally via substring selectors on `rounded` classes (Terminal 2px, Glass 22px, Brutalist 0, PS5 20px, Xbox 8px, Steam 6px, Switch 14px), so components must express corners with a `rounded-*` class, not inline `border-radius`, to stay re-skinnable. Platform houses override it the same way inside their scope (Xbox 6px, Steam 4px, Epic 12px).

**The No-rounded-on-Thumbnails Rule.** A small landscape thumbnail whose shape matters (the matrix list's 64×36 PSN-style icon) takes its radius from its own CSS class and no `rounded` class, because the Glass style forces 22px on anything carrying one and turns it into a circle.

## Components

### Buttons
Confident, lit from within, and always responsive to the cursor.
- **Shape:** gently rounded (12px).
- **Primary:** fills with the brand gradient (`--accent-grad`) and dark text (`background`), body-medium bold; may carry a second line of 11px subtext at 80% opacity. Sits on the accent lift shadow.
- **Hover / Focus:** lift 2px (`-translate-y-0.5`) and `brightness-110`; everything else inherits the global hover glow and 1px lift (0.15s ease). Focus rings show only for keyboard focus (`:focus-visible`).
- **Secondary:** `surface` fill, 1px `border`, foreground text, optional 17px muted leading icon; on hover the fill steps to `surface-2` and the border to accent at 50%.
- **Text link:** `accent-text`, bold, with a hover fill of `surface-2` plus underline; in-app "see all" links are 12px bold uppercase accent with underline on hover.

### Chips and tags
- **Accent chip:** accent at 14% fill, `accent-text`, 10–11px bold, fully rounded.
- **Example chip:** transparent with a 1px `border`, muted 11px semibold text reading "Ejemplo" (translated). Mandatory on any block that shows synthetic data.
- **Micro tag:** micro type, uppercase, on `surface-2` (or a 1px border, or white at 10–15% over art), 2–6px radius: genres and platforms on release cards.

### Cards / Containers
- **Corner Style:** 18–20px in the app, 16–24px on the landing.
- **Background:** `surface`; nested rows use `background` or `surface-2` for inset contrast.
- **Shadow Strategy:** flat at rest (see Elevation); hero cards get the panel drop or aura.
- **Border:** 1px `border`; highlighted cards use accent at 35% or gold at 45%.
- **Internal Padding:** 16–24px; feature panels 20–28px.

### List rows inside cards
Rows inside a card (the matrix's quadrant list, the community top, rankings) mark hover with a background fill only (`surface-2` in a card, `surface` on the page) and carry the `.fila-lista` marker, which cancels the global glow and lift: a 12px glow would leak past the card's edge. Ranked and board rows are divided by 1px hairlines, not boxed.

### Inputs / Fields
- **Style:** `background` fill inside a `surface` context, 1px `border`, 8px radius, 6px × 10px padding, body-UI type. Text selection is re-enabled on inputs (it is disabled app-wide for a native feel).
- **Focus:** native outline only for keyboard focus.
- **Selects:** always `components/ui/Selector.tsx`, never a native `<select>` (each OS paints those its own way). Trigger styled as a field; panel is a `surface` popover with 12px radius, rows with `surface-2` hover, the chosen one in `accent-text` with a check. Optional group headers, right-aligned detail (console, %), leading icon, and a search box above 12 options. Opens upward when there is no room below.

### Navigation
- **Style:** sticky 64px header with `border` bottom and backdrop blur; wordmark in the display face at 18px with 0.06em tracking. Links are 13px semibold, 0.04em tracking, muted, 8px radius; on hover the text brightens to white with a 15px accent glow. Dropdowns are `surface` panels with 12px radius. Below `lg` the nav collapses into a 44px round menu button.

### Progress
- **Bars:** fully rounded 4–8px tracks in `surface-2`, filled with `--accent-grad-h` (or the platform colour inside a platform context). Paired with `earned/total` in tabular figures and the percentage in `accent-text`.

### Profile: Holographic Card (signature)
The profile header's identity is a 300px-wide collectible card. Its frame is a 1px gradient border (150deg: accent at 80% → accent at 15% → `accent-2` → accent at 40%) around a 22px-radius face that fades from `surface-2` to `surface`. Inside: clan tag or "PARAGON" in `accent-text` and a fully rounded level badge (label type), a 104px avatar in its frame, the display name in the display face (1.5rem, uppercase, truncated) over the muted handle, then a hairline-divided row of four stats (figure in the display face, platinum count in `platinum`, label-small caption). A foil layer in `screen` blend combines a white spot that follows the pointer (`--mx`, `--my`) with a 115deg iridescent sweep (platinum, peach, lavender at 14–18%); the card tilts up to 8deg × 10deg toward the mouse in perspective 900px and eases back in 400ms (`cubic-bezier(0.16, 1, 0.3, 1)`). Touch and reduced motion get a still card with the foil fixed. The whole card links to the service record.

### Game: Strategy Guide (signature)
The trophy list's list view reads like a printed strategy guide. Groups become **chapters**: an uppercase title-weight heading with wide tracking over a 2px `border` rule, with "earned/total" at the end in muted tabular figures. Each chapter is one 14px-radius `surface` sheet whose rows are split by **dashed** hairlines; from `sm` a faint vertical rule 172px from the right edge draws the guide's **margin**, where the missable note (label, italic, `danger`), grade, points and date live (on mobile the missable note moves under the description). Each row starts with a 20px checkbox (2px muted border, 4px radius) that fills with the accent and a dark check when earned; earned names and icons drop to 55% opacity. Rows hover to a 5% accent wash.

### Library: Box Spines (signature, default view)
The library shelves games as box spines. A spine is 52px wide (44px on mobile), 4px-rounded at the top and 2px at the base, painted with the game's cover under a fixed black veil (50% → 78%) with a light left edge and a dark right edge. A 10px stripe at the top and the percentage at the bottom (label small, tabular) take `--metal`, the game's best grade colour; the title runs vertically (`writing-mode: vertical-rl`) in the display face, body-small, uppercase, `spine-ink`. Spines stand on an 8px shelf plank (border tone lightened with white into `surface-2`, deep soft shadow). Hover or keyboard focus pulls the spine up 12px with the spine lift in its metal (260ms, out-expo); reduced motion removes the transition.

### Statistics: Heat Calendar (protagonist)
The activity heatmap's large variant leads the statistics page: section-headline title with the total trophies beside it in the accent (display figure), a full-width year grid (minimum 640px, scrolls horizontally below that) of 2px-rounded day cells on `surface-2`, filled along the metal ladder (bronze, silver, gold, platinum by activity level). Hover outlines a day in `foreground`. Axis labels and the legend use label-small muted type. The compact variant elsewhere uses the accent at stepped opacities instead of metals.

### Discover: Difficulty × Hours Matrix (signature)
A plane (square on mobile, 16:10 from `sm`, 16px radius, 1px border) plots each game as a 26px icon (20px on mobile, 7px radius, a 1.5px `background` ring and a small drop) by platinum rarity against average hours. The plane is washed with a faint diagonal from `good` at 7% (easy and short) to `danger` at 8% (hard and long), quartered by two hairlines, with each quadrant named in a label-type uppercase button at its corner. Points outside the chosen quadrant drop to 35% opacity; hover scales a point 1.8× above the rest. Beside it at `lg` a 320px `surface` card lists the chosen quadrant: 64×36 landscape thumbnails (6px radius, no `rounded` class), title body-UI, "rarity · hours" caption, rows using the list-row pattern.

### Discover: Hit List (signature)
Rankings read like a music chart: the position is the protagonist. Community top, platform rankings and new entries use **outline rank numerals** (see Typography) in a fixed first column (4.5rem; 3.25rem for rankings; 2.5rem for new entries), a 52px / 44px / 40px cover (6px radius, soft drop), then title and caption. The podium fills its numeral in gold, silver and bronze. Rows are separated by hairlines and hover to `surface` while the numeral's stroke turns `accent-text`. Gems show their score as a 1.375rem accent figure. The featured carousel can be **numbered**: each slide carries its position as a giant outline numeral at the bottom right. No up/down movement arrows: previous positions are not stored.

### News and Discover: Wire Ticker
News items (the platform news feed and the news page's latest) are ticker rows: a fixed time or date column (4–5rem; display face, body-small, tabular, uppercase, flap amber on the news page), the headline, and a small photo on the right (72×48, 120×68 from `md`, 6px radius). Rows hover to a 6% accent wash (or `surface-2` in a card).

### News: Departures Board (signature)
Upcoming releases as an airport departures board inside the board bezel (14px radius). Rows: date as split-flap tiles, 40×54 cover (4px radius), title, and a right-aligned status column (display face, caption, uppercase, 0.08em) that counts down, turning flap amber under 30 days and `good` once released. Each **flap tile** is 1.05 × 1.55rem, 3px radius, a dark two-tone face split by a hinge line, flap-amber letters in the display face; a tile is an object and stays dark in light mode. Column headers in label-small muted type appear from `md`. A compact variant (smaller tiles and covers) serves the "just arrived" side column. Board title in the display face, 1rem, uppercase, 0.14em, `accent-text`.

### Friends: Stadium Scoreboard (signature)
Friends are ranked on a stadium scoreboard that follows the theme: the board bezel over a 6px dotted lamp grid (white at 3.5%; black at 4% in light mode). The title is the same 1rem uppercase 0.14em accent rotulo as the departures board. Each row is a grid (position, 44px avatar, name, then four figure columns and actions from `sm`) with 14px × 24px padding and hairline dividers, hovering to white at 2.5%. Figures are **LED numerals**: display face, tabular, `accent-text`, a 3px dot mask and a 12px accent glow; platinum counts glow in `platinum` and only the first place glows in `gold`. **Your own row is lit**: an accent gradient from 20% to transparent with a 3px inset accent bar on the left and a small solid "you" tag (label small, 800, `background` on `accent-text`, 4px radius). Challenges and co-op blocks sit inside the same bezel.

### Dashboard: Cockpit
Each dashboard module is mounted like an instrument bolted to a panel: four **corner brackets** (12px arms, 1.5px, accent at 40%, drawn 6px outside the module at 70% opacity) that brighten and move out to 8px on hover (200ms). The headline figure uses the cockpit numeral (`accent-2` mixed 70% into `foreground` with a 40px accent glow). The panel ends in an **edit footer**: a 20px-radius `surface` strip with a dashed accent border at 35% (70% on hover) over a faint 12-column, 14px-row accent grid, so the cockpit's own grid shows through, with a muted body-small count of hidden modules and an action linking to the hide settings.

### Community: Wall of Achievements
The community feed becomes a two-column masonry wall from `md`; platinum entries get a cover banner (144px, 176px from `sm`) across the top of the card. Cards hover to a faint accent wash rather than lifting.

### Settings: Refined Control Panel
- **Navigation:** links with a lucide icon and label in body-UI muted type, grouped (profile, account, panel). On mobile a horizontal scrolling strip of bordered links; from `md` a sidebar where groups are separated by a hairline and 20px, each with a label-type uppercase 0.12em muted group label. Hover fills `surface-2` and brightens the text; the current page is `foreground` on `--accent-soft` with an accent icon, and in the sidebar a 2px inset accent bar on the left.
- **Option groups:** no cards. A group is a hairline on top, 24px above, a title-small heading, an optional muted body-small help line (62ch), then its controls.
- **Live preview:** from 1280px a sticky 17rem preview column with a label-type caption (mini app in Appearance, "how others see you" in General).
- **Game palette picker:** cover swatches with a 4px pad that fill `surface-2` on hover and take a 2px accent outline when active.

### Discover: Platform Tiles
Access tiles for the platforms that sync (PlayStation, Xbox, Steam, Epic): 12px radius, brand-gradient fill, white label and white logo; the highlighted tile uses `--accent-grad` with dark text and the rest `surface-2`.

### Platform Houses (scoped signature)
Each platform page lives "in its own house": the house palette (see Colors), a light top bar (40px logo tile filled with the accent, name and breadcrumbs), and a **featured hero** whose data is identical in the four houses but whose composition evokes each platform without copying its interface or logos:
- **PlayStation:** full-bleed art in a 20px-radius scene (min 28rem) with a row of 56px game tiles on top; the active tile grows to 88px with a white outline. Title in Barlow, no uppercase, light tracking.
- **Xbox:** a mosaic, 2 columns on mobile, 6 from `md` with 9rem rows: the chosen game spans 4×2 and four squares fill the rest; 6px radius; hover draws a 3px outline in the house accent text.
- **Steam:** a 4px capsule, 16:9 main art with a side column (gradient #2a3f5a → #0f1922) holding the title in Barlow 600 and a 2×2 grid of 16:9 thumbnails (60% opacity, sky outline when active), paging dots below, and Steam's green gradient button (#75b022 → #588a1b, #d2efa9 text).
- **Epic:** a 16px-radius banner (min 26rem) with a 15rem list of games on the right from `lg` (horizontal strip below), active item on `surface-2`.
Shared parts: art enters with a 600ms fade from 103% scale; a black veil (85% at the bottom); the hero title in the display face `clamp(1.75rem, 4.5vw, 3rem)`, white, balanced; a fully rounded white **house button** with near-black text that turns `accent-2` and lifts 1px on hover; round 36px arrow buttons in white at 12% (28% on hover). The hero advances every 8s except under the pointer or with reduced motion.

### Trofeo desbloqueado toast (signature)
The console's trophy pop-up, for every platform. When a sync (`syncNowAction` / `syncPlatformAction`) returns new trophies, up to three cards stack at the bottom centre of the viewport (20px from the bottom, 8px apart, max 384px wide), each following the previous by 140ms. A card is `surface` at 92% with a 10px backdrop blur, a 16px radius, an accent border at 35%, and `0 18px 40px -16px rgb(0 0 0 / 0.7)` under a faint inset highlight. Inside: the real 48px trophy photo in a 14px-radius tile, then the "Trofeo desbloqueado" line (11px bold `accent-text`, the console's own notification wording, specific to this toast), the trophy name (display face, body-medium, truncated) and the game (12px muted). Only the first card carries the close button (15px icon, 8px radius, hover fill `surface-2`). If more arrived than are shown, a fully rounded bordered "+N" chip follows. Motion: each card rises 18px from 97% scale in 520ms (`cubic-bezier(0.16, 1, 0.3, 1)`); 300ms later the photo flashes once with an accent halo (`0 0 22px 4px` at 55%, 1.2s ease-out, then gone). The whole stack dismisses itself after 7s. Under reduced motion both animations are removed and the cards simply appear. It is a `role="status"` polite live region.

### Carreras world: Ligas and Clanes (scoped signature)
Competition pages read like a race timing tower. This world lives only on `/ligas`, `/ligas/[id]`, the monthly league rows, `/clanes` and `/clanes/[tag]`.
- **Dorsal:** position as "P1", "P2"… (or a clan tag) on a plate skewed −12deg, filled with the competitor's livery and set in its ink: display face, 14px bold, 0.02em tracking, tabular figures, min 44px wide, `0 6px 14px -8px` shadow in the livery colour. The text inside is counter-skewed upright. The large variant (clan header) is 24px text, min 72px wide.
- **Skewed titles:** the page title's text (not its box) is skewed −8deg, uppercase display face.
- **Figures:** points, scores and counts use the display face bold with tabular figures; the leading figure takes `accent-text`.
- **Gap to leader:** standings end with a muted tabular column showing the deficit to P1 as "−N" (a true minus sign); P1 shows the translated "leader" word.
- **Row streak:** each standings row carries its competitor's livery as `--librea`; on hover a 14% livery band sweeps left to right across the row (600ms, `cubic-bezier(0.16, 1, 0.3, 1)`) over a 4% accent fill. Reduced motion removes the sweep transition.
- **Livery band:** under a clan's header, a 6px fully rounded band of repeating −60deg stripes (18px livery, 4px ink) at 85% opacity.

### Landing: Convergence to One Profile (signature)
The landing's first-viewport story. Four platform columns (PlayStation #2f7ad6, Steam #66c0f4, Xbox #16a316, Epic #c9ced6) sit in a 2×2 grid on mobile and a row of four at `lg`. Each is a `surface` card, 16px radius, with a logo tile tinted 18% in its colour and three game rows with thin progress bars in that colour. Dashed curved SVG paths (1.5px, 45% opacity, `4 6` dash) lead from each column to a single **Paragon card**: `surface`, 24px radius, accent-35% border, the Paragon aura, a 96px **level ring** (7px stroke on a `surface-2` track, gradient from accent-2 to accent, round caps, level numeral centred in the display face), the four platform logos overlapped as 28px discs, then a hairline-divided "closest platinum" row with the trophies-remaining numeral in platinum. On scroll-in (35% visible) dots travel the paths, column borders take on 45% of their platform colour, the ring fills and the level counts up over 1.8s (`cubic-bezier(0.16, 1, 0.3, 1)`). The final state is painted from the start, so without JS or with reduced motion it is identical, only still.

### Landing: Museum-Cartel Vitrine (signature)
The community's rarest trophies of the week, displayed like museum objects. Each exhibit is a link: a **niche** (112px, 144px from `sm`) lit from above by `radial-gradient(70% 90% at 50% 0%, rgb(159 212 236 / 0.16), transparent 70%)` holding the 72px trophy photo, then a **cartel** below a hairline: trophy name (display face, body-medium, truncated), game (12px muted), rarity (11px bold `accent-text`), hunter and time (11px muted). A **shelf plank** runs under each exhibit: 8px tall, gradient from a whitened border tone to `surface-2`, with `0 10px 24px -12px rgb(0 0 0 / 0.7)`. On hover the exhibit's background fills with `surface` and the trophy rises 4px. Only complete rows render (2 per row on mobile, 3 from `sm`). When no rare trophies exist, a single **shelf** panel (`surface` with a 5% platinum top-light and a 3px inset darker bottom edge) lists recent platinums instead.

### Landing: Stepped Route Rail (signature)
A numbered vertical route: 40px circular markers with a 2px accent border, `background` fill and `accent-text` numerals in the display face, joined by a 2px rail that fades from `accent` to accent at 10% (drawn behind the markers at 19px from the left). Steps gap 28px; title in the display face at 18px, body 14px muted at 52ch. Beside it at `lg`, a sticky 24px-radius example panel shows the next trophies in 12px-radius rows on `background`, with rarity figures in their grade colour.

## Do's and Don'ts

### Do:
- **Do** derive every accent tint from `--accent-rgb` or the `--accent-soft`, `--accent-line`, `--accent-glow`, `--accent-text`, `--accent-grad` and `--accent-grad-h` variables.
- **Do** give every clickable control a visible hover state. The global rule covers `button`, rounded `a` and `cursor-pointer` elements (glow plus 1px lift); an element with its own `hover:scale-*` or `hover:-translate-*` keeps its own lift and still gets the glow.
- **Do** mark list rows inside a card with `.fila-lista` and give them a background-fill hover instead of the global glow.
- **Do** keep global hover and style-axis CSS outside `@layer` so it beats Tailwind utilities without `!important`, and handle per-breakpoint display of those elements in the same CSS, not with `hidden`/`sm:block` utilities.
- **Do** add `min-w-0` to grid and flex children that hold truncating text.
- **Do** wrap horizontally scrolling rows in `-mx-4 px-4` so hover glows are not clipped.
- **Do** route all copy through next-intl (es, en, de, fr); no literal UI strings in components.
- **Do** show real data only; any synthetic block carries the translated "Ejemplo" chip.
- **Do** honour `prefers-reduced-motion` by stopping animations outright and painting the final state from the start.
- **Do** prefix surface-scoped CSS in `globals.css` (`landing-`, `guia-`, `lomo-`, `matriz-`, `exitos-`, `cabina-`, `marcador-`, `salidas-`, `ajustes-`, `casa-`), because the stylesheet is global to the whole app.
- **Do** use `rounded-*` and `shadow-*` classes for corners and shadows so the style axis can re-skin them, except on small shape-critical thumbnails.
- **Do** give a new full palette both a `.dark.accent-x` block (accent plus the four ground tokens) and a `.light.accent-x` darker accent, and a half-ground/half-accent swatch.
- **Do** correct any computed accent to at least 5:1 contrast against its own surface (dark) and white (light) before applying it, as `lib/paletaJuego.ts` does.
- **Do** build a new section-scoped world by redefining the theme tokens on a wrapper (as the platform houses do) so existing components repaint untouched.
- **Do** fade image scrims to `from-background` and set text over covers in `foreground`, outside the always-dark houses and own-art objects.
- **Do** put a heading's context below it as a muted subtitle.
- **Do** keep the Carreras world (dorsals, livery, skewed titles, row streaks) inside Ligas and Clanes.
- **Do** use only the type steps in the frontmatter, including the off-Tailwind ones (0.5625, 0.625, 0.6875, 0.8125, 0.9375, 1.0625rem).

### Don't:
- **Don't** write literal accent colours such as `rgba(74, 158, 255, .14)`; they freeze one accent and one mode.
- **Don't** use the trophy metals (bronze, silver, gold, platinum) for anything but grade, rank and the heat calendar's metal ladder.
- **Don't** put white text on an accent fill; use `background`.
- **Don't** set text sizes in px; they ignore the user's text-size setting.
- **Don't** put `overflow: hidden` on the element that owns a hover glow or shadow.
- **Don't** hard-code dark hex overlays (such as `#0a0d13` gradients) or white text over covers in theme-following surfaces; use `from-background` and `foreground` so light mode, OLED and the full palettes stay coherent.
- **Don't** put eyebrow or kicker labels above headings.
- **Don't** use gradient text; `text-gradient` is a leftover utility, not part of the system.
- **Don't** bring the Carreras world (dorsals, livery colours, skews, livery streaks) into the library, guides or the dashboard; its competitive energy tires everywhere else.
- **Don't** let a full palette repaint the ground in light, OLED or high-contrast mode.
- **Don't** use platform brand colours outside platform-identity contexts.
- **Don't** make the scoreboard or departures board a fixed-colour island; only the flap letters keep their amber.
- **Don't** apply the LED dot mask to words; it is for figures only.
- **Don't** copy a platform's real interface or detailed logotypes inside its house; evoke it through palette and composition.
- **Don't** use `100vw` for full-bleed backgrounds; use the 100vmax shadow plus `clip-path` pattern.
- **Don't** invent testimonials, user counts or figures; landing proof comes from the live database queries only.
