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
  good: "#4ec98a"
  danger: "#ff6b6b"
  bronze: "#c07b4a"
  silver: "#b9c2cc"
  gold: "#e2b53e"
  platinum: "#9fd4ec"
  light-background: "#f4f6fa"
  light-surface: "#ffffff"
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
  title:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  numeral:
    fontFamily: "Chakra Petch, Barlow, ui-sans-serif, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-sm:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  md: "6px"
  lg: "8px"
  btn: "10px"
  xl: "12px"
  2xl: "16px"
  card: "18px"
  tile: "20px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "28px"
  section: "80px"
  section-wide: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.background}"
    typography: "{typography.body-sm}"
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
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  progress-track:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.full}"
    height: "4px"
---

# Design System: Paragon

## Overview

**Creative North Star: "The Night Trophy Room"**

Paragon is a trophy room with the lights down: a deep navy-black floor (#0a0d13), surfaces one step up, and the only strong light falling on the things a hunter earned. The brand accent is platinum itself, the colour of the trophy being chased, so the interface glows in the same pale ice-blue the platinum trophy does. Everything else stays quiet: muted blue-grey text, hairline borders, flat tonal cards. Light is used as a material, not as decoration: a soft halo leaks from the top-left of every page, the landing's vitrine lights each trophy from above, and hovering anything clickable makes it glow in the accent.

The system is built on three independent axes that the user controls: **mode** (dark default, light, OLED, high contrast), **accent** (platinum default, plus blue, violet, red, green, orange and a free colour), and **style** (Classic default, plus Terminal, Glass, Brutalist, PS5, Xbox, Steam, Switch), which rewrites corner radius, shadow, type and page backdrop across every existing component. Every component must therefore be written against tokens, never against literal colours, so the three axes can repaint it without a code change.

Density is medium: a hunter's dashboard is data-rich, so type is compact (13px secondary text is common) while hero moments go large, condensed and uppercase. Numbers are the heroes: counts, levels and trophies-remaining are set big in the display face, often in platinum.

**Key Characteristics:**
- Night navy base with tonal layering (background, surface, surface-2) instead of heavy shadows.
- Platinum accent, derived everywhere from one RGB channel variable.
- Chakra Petch (condensed, technical) for headings and numerals; Barlow for everything read.
- Trophy grade colours (bronze, silver, gold, platinum) are semantic and never repurposed.
- Every clickable glows on hover, enforced globally.
- User-selectable mode, accent and style axes; components stay token-bound so all three work.

## Colors

A cool, near-monochrome night palette in which platinum is the single brand light and the four trophy metals are reserved meanings.

### Primary
- **Platinum Ice** (`accent`): the brand accent since the platinum rebrand. Declared as a bare RGB channel (`--accent-rgb: 124 196 228`) so every tint derives from it: pill backgrounds at 14% (`--accent-soft`), pill and card borders at 32–35% (`--accent-line`), glows at 45–50% (`--accent-glow`, the global hover drop-shadow). Primary buttons fill with the vertical brand gradient (`--accent-grad`, 160deg from accent-2 to accent); progress bars use the horizontal one (`--accent-grad-h`).
- **Frost Highlight** (`accent-2`): the light end of the brand gradient and the pale top of the level ring.
- **Accent text** (`--accent-text`): not a separate hue but the accent mixed 55% with white on dark (75% with black in light mode, 30% with white in high contrast). Use it for any accent-coloured text, links and percentages; raw `accent` is for fills and strokes.
- **Steel Platinum** (`accent-light`): the accent in light mode. Pastel ice-blue washes out on white, so light mode swaps the channel to a saturated blue steel.
- **Legacy Blue** (`accent-blue`): the previous brand blue, kept as the `.accent-blue` preset. Each preset has a stronger light-mode variant.

### Tertiary (trophy grades)
- **Platinum** (`platinum`), **Gold** (`gold`), **Silver** (`silver`), **Bronze** (`bronze`): the four trophy metals. They colour trophy icons, grade-specific rarity figures, platinum counts and the first-place hunter's card (gold tint at 8% fill, 45% border). They mean grade, and only grade.

### Semantic
- **Signal Green** (`good`): live and positive states: the "playing now" dot, the trust checkmarks under the landing CTAs, success.
- **Alarm Coral** (`danger`): errors and destructive actions.

### Neutral
- **Night Floor** (`background`): the page. Always painted with the accent halo `radial-gradient(1200px 600px at 15% -10%, var(--glow), var(--background) 60%)` fixed to the viewport.
- **Vitrine** (`surface`): cards, panels, the header.
- **Shelf** (`surface-2`): nested fills, progress tracks, hover fill for list rows and secondary buttons.
- **Hairline** (`border`): 1px borders on every card and input; also the scrollbar thumb.
- **Moonlight** (`foreground`): primary text.
- **Dusk Grey** (`muted`): metadata, dates, descriptions. Raised from #8794a8 for contrast because it carries functional text.
- **Paper** (`light-background`, `light-surface`): light mode's page and card; OLED swaps to pure black (#000000) with surfaces #0a0a0c / #141418; high contrast brightens borders to #5a6b82 and text to #ffffff.

### Named Rules
**The One Channel Rule.** Every accent tint is `rgb(var(--accent-rgb) / alpha)` or one of the derived `--accent-*` variables. A literal `rgba(124,196,228,…)` breaks every other accent and every other mode.

**The Metals Mean Grade Rule.** Bronze, silver, gold and platinum are only for trophy grade and rank. Platinum is also the brand accent's namesake, but the `platinum` token (#9fd4ec) stays fixed across accents because it represents the trophy, not the brand.

**The Dark Text on Light Rule.** Text on an accent fill is `background` (dark), never white. Accent presets are chosen so that pairing reads.

## Typography

**Display Font:** Chakra Petch (500, 600, 700), falling back to Barlow
**Body Font:** Barlow (400–700), falling back to ui-sans-serif, system-ui
**Label/Mono Font:** JetBrains Mono, used only when the user picks the Terminal style (it replaces both families)

**Character:** Chakra Petch is squared-off and technical, a scoreboard or console-UI voice; set uppercase and tight it reads as a trophy plate. Barlow is a slightly condensed grotesque that stays readable at the small sizes a data-heavy dashboard needs.

### Hierarchy
- **Display** (700, `clamp(2.5rem, 9vw, 5rem)`, 0.95, −0.025em, uppercase): the landing hero only; one phrase of the headline can switch to `platinum`. Caps at about 20ch.
- **Headline** (700, `clamp(1.875rem, 5vw, 2.75rem)`, 1.05, −0.015em, uppercase): landing section titles. App page titles use the same face at 2.625rem uppercase; in-app section headings drop to 1.5rem (`text-2xl`), sentence case.
- **Title** (700, 1.125–1.25rem, tight): card titles, game names, step titles, trophy names on cartels.
- **Numeral** (700, 1.875–6rem, line-height 0.8–1, tabular figures): levels, counts, trophies remaining. Often `platinum`. The dashboard's platinum count goes to 6rem.
- **Body** (400, 1rem, 1.625, `muted` for descriptions): paragraphs cap at 60ch; step bodies at 52ch.
- **Body small** (600, 0.8125rem): list rows, nav links (with 0.04em tracking), game titles in rows.
- **Label** (600–700, 0.625–0.6875rem): chips, metadata, rarity figures. Stat labels inside a stat tile may go uppercase with 0.1–0.14em tracking.

### Named Rules
**The Headings Wear the Plate Rule.** `h1`, `h2`, `h3` and `.font-heading` always use the display face (set globally). Numerals that matter use it too, with `tabular-nums`.

**The rem-Only Rule.** Text sizes are in rem, never px: the user's text-size setting (87.5–125%) scales the root, and px sizes ignore it.

## Layout

A centred container of max 1240px with 16px gutters on mobile and 28px from `sm` up; the sticky header is 64px tall. Landing sections breathe on an 80px rhythm (`pt-20`), 96px from `sm` (`pt-24`); in-app pages stack sections at about 36px (`space-y-9`). Card interiors pad 16–24px (20–28px on feature panels); grid gaps are mostly 12px (`gap-3`), 10px on dense stat rows.

Responsive grammar is Tailwind's: `sm` 640px and `lg` 1024px do almost all the work. Grids go 2 columns on mobile, 3 at `sm`, 4–5 at `lg`; asymmetric two-column splits at `lg` use fractional tracks (`1.1fr 0.9fr`, `1.4fr 1fr 1fr 1fr`). An odd last item in a 2-column mobile grid spans both columns rather than leaving a hole; vitrine rows render only complete rows.

### Named Rules
**The min-w-0 Rule.** Any grid or flex child that can contain truncating text gets `min-w-0`. A `1fr` or `auto` track defaults to min-content width, so a long title silently widens the column and breaks the grid instead of truncating.

**The Bleed-for-Glow Rule.** A horizontally scrolling or marquee row is wrapped as `-mx-4 px-4` (negative margin plus matching padding) so the hover glow and lift of its children have room and are not clipped by the row's `overflow-hidden`. Edge fades are 64px gradients from `background` to transparent.

**The Clip Inside Rule.** Never put `overflow: hidden` on the element that owns a hover shadow or drop-shadow glow; clip an inner layer instead.

## Elevation & Depth

Depth is mostly tonal: background, surface and surface-2 step up in lightness, and every card carries a 1px `border`. Shadows are reserved for two jobs: a soft, deep drop under hero objects (feature panels, the Paragon card, primary buttons) and the accent glow that answers hover. The page itself has depth from the fixed accent halo. The style axis can override all shadows globally (Terminal removes them, Glass diffuses them, Brutalist makes them hard and offset, console styles tint them).

### Shadow Vocabulary
- **Hover glow** (`filter: drop-shadow(0 0 12px rgb(var(--accent-rgb) / 0.5))`): applied globally to every enabled button, rounded link and `cursor-pointer` element on hover.
- **Accent lift** (`box-shadow: 0 14px 32px -12px rgb(var(--accent-rgb) / 0.7)`): under primary gradient buttons.
- **Paragon aura** (`box-shadow: 0 28px 60px -24px rgb(var(--accent-rgb) / 0.45), inset 0 2px 0 rgb(255 255 255 / 0.03)`): the unified profile card.
- **Panel drop** (`box-shadow: 0 24px 50px -28px rgb(0 0 0 / 0.6)`): neutral feature panels such as the route card.
- **Card hover drop** (`box-shadow: 0 30px 60px -15px rgba(0,0,0,0.8)`): game cards on hover, together with tilt.

### Named Rules
**The Light Answers Touch Rule.** Surfaces are flat at rest; the accent glow appears only in response to hover or as the aura of a single hero object per view.

## Shapes

Softly rounded, never pill-shaped containers. The scale in use: 8px (`lg`) for inputs, nav links and small icon tiles; 10px for compact buttons; 12px (`xl`) for main buttons and list rows, the most common radius; 16px (`2xl`) for landing columns and hunter cards; 18–20px for app cards and stat tiles; 24px (`3xl`) for landing feature panels (Paragon card, route card, final CTA); full rounding only for chips, avatars, status dots, progress bars and step numbers. Borders are 1px `border`, 2px only for step markers and avatar rings. Platform and trophy icons sit in small rounded-square tiles tinted at 18–22% of their own colour.

The style axis overrides radius globally via substring selectors on `rounded` classes (Terminal 2px, Glass 22px, Brutalist 0, PS5 20px, Xbox 8px, Steam 6px, Switch 14px), so components must express corners with a `rounded-*` class, not inline `border-radius`, to stay re-skinnable.

## Components

### Buttons
Confident, lit from within, and always responsive to the cursor.
- **Shape:** gently rounded (12px).
- **Primary:** fills with the brand gradient (`--accent-grad`) and dark text (`background`), 15px bold; may carry a second line of 11px subtext at 80% opacity. Sits on the accent lift shadow.
- **Hover / Focus:** lift 2px (`-translate-y-0.5`) and `brightness-110`; everything else inherits the global hover glow and 1px lift (0.15s ease). Focus rings show only for keyboard focus (`:focus-visible`).
- **Secondary:** `surface` fill, 1px `border`, foreground text, optional 17px muted leading icon; on hover the fill steps to `surface-2` and the border to accent at 50%.
- **Text link:** `accent-text`, bold, with a hover fill of `surface-2` plus underline; in-app "see all" links are 12px bold uppercase accent with underline on hover.

### Chips
- **Accent chip:** accent at 14% fill, `accent-text`, 10–11px bold, fully rounded.
- **Example chip:** transparent with a 1px `border`, muted 11px semibold text reading "Ejemplo" (translated). Mandatory on any block that shows synthetic data.

### Cards / Containers
- **Corner Style:** 18–20px in the app, 16–24px on the landing.
- **Background:** `surface`; nested rows use `background` or `surface-2` for inset contrast.
- **Shadow Strategy:** flat at rest (see Elevation); hero cards get the panel drop or aura.
- **Border:** 1px `border`; highlighted cards use accent at 35% or gold at 45%.
- **Internal Padding:** 16–24px; feature panels 20–28px.

### Inputs / Fields
- **Style:** `background` fill inside a `surface` context, 1px `border`, 8px radius, 6px × 10px padding, 14px semibold. Text selection is re-enabled on inputs (it is disabled app-wide for a native feel).
- **Focus:** native outline only for keyboard focus.

### Navigation
- **Style:** sticky 64px header with `border` bottom and backdrop blur; wordmark in the display face at 18px with 0.06em tracking. Links are 13px semibold, 0.04em tracking, muted, 8px radius; on hover the text brightens to white with a 15px accent glow. Dropdowns are `surface` panels with 12px radius. Below `lg` the nav collapses into a 44px round menu button.

### Progress
- **Bars:** fully rounded 4–8px tracks in `surface-2`, filled with `--accent-grad-h` (or the platform colour inside a platform context). Paired with `earned/total` in tabular figures and the percentage in `accent-text`.

### Landing: Convergence to One Profile (signature)
The landing's first-viewport story. Four platform columns (PlayStation #2f7ad6, Steam #66c0f4, Xbox #16a316, Epic #c9ced6) sit in a 2×2 grid on mobile and a row of four at `lg`. Each is a `surface` card, 16px radius, with a logo tile tinted 18% in its colour and three game rows with thin progress bars in that colour. Platform colours appear only here and in platform-identity marks. Dashed curved SVG paths (1.5px, 45% opacity, `4 6` dash) lead from each column to a single **Paragon card**: `surface`, 24px radius, accent-35% border, the Paragon aura, a 96px **level ring** (7px stroke on a `surface-2` track, gradient from accent-2 to accent, round caps, level numeral centred in the display face), the four platform logos overlapped as 28px discs, then a hairline-divided "closest platinum" row with the trophies-remaining numeral in platinum. On scroll-in (35% visible) dots travel the paths, column borders take on 45% of their platform colour, the ring fills and the level counts up over 1.8s (`cubic-bezier(0.16, 1, 0.3, 1)`). The final state is painted from the start, so without JS or with reduced motion it is identical, only still.

### Landing: Museum-Cartel Vitrine (signature)
The community's rarest trophies of the week, displayed like museum objects. Each exhibit is a link: a **niche** (112px, 144px from `sm`) lit from above by `radial-gradient(70% 90% at 50% 0%, rgb(159 212 236 / 0.16), transparent 70%)` holding the 72px trophy photo, then a **cartel** below a hairline: trophy name (display face, 15px bold, truncated), game (12px muted), rarity (11px bold `accent-text`), hunter and time (11px muted). A **shelf plank** runs under each exhibit: 8px tall, gradient from a whitened border tone to `surface-2`, with `0 10px 24px -12px rgb(0 0 0 / 0.7)`. On hover the exhibit's background fills with `surface` and the trophy rises 4px. Only complete rows render (2 per row on mobile, 3 from `sm`). When no rare trophies exist, a single **shelf** panel (`surface` with a 5% platinum top-light and a 3px inset darker bottom edge) lists recent platinums instead.

### Landing: Stepped Route Rail (signature)
A numbered vertical route: 40px circular markers with a 2px accent border, `background` fill and `accent-text` numerals in the display face, joined by a 2px rail that fades from `accent` to accent at 10% (drawn behind the markers at 19px from the left). Steps gap 28px; title in the display face at 18px, body 14px muted at 52ch. Beside it at `lg`, a sticky 24px-radius example panel shows the next trophies in 12px-radius rows on `background`, with rarity figures in their grade colour.

## Do's and Don'ts

### Do:
- **Do** derive every accent tint from `--accent-rgb` or the `--accent-soft`, `--accent-line`, `--accent-glow`, `--accent-text`, `--accent-grad` and `--accent-grad-h` variables.
- **Do** give every clickable control a visible hover state. The global rule covers `button`, rounded `a` and `cursor-pointer` elements (glow plus 1px lift); an element with its own `hover:scale-*` or `hover:-translate-*` keeps its own lift and still gets the glow.
- **Do** keep global hover and style-axis CSS outside `@layer` so it beats Tailwind utilities without `!important`.
- **Do** add `min-w-0` to grid and flex children that hold truncating text.
- **Do** wrap horizontally scrolling rows in `-mx-4 px-4` so hover glows are not clipped.
- **Do** route all copy through next-intl (es, en, de, fr); no literal UI strings in components.
- **Do** show real data only; any synthetic block carries the translated "Ejemplo" chip.
- **Do** honour `prefers-reduced-motion` by stopping animations outright and painting the final state from the start.
- **Do** prefix surface-scoped CSS in `globals.css` (for example `landing-`), because the stylesheet is global to the whole app.
- **Do** use `rounded-*` and `shadow-*` classes for corners and shadows so the style axis can re-skin them.

### Don't:
- **Don't** write literal accent colours such as `rgba(74, 158, 255, .14)`; they freeze one accent and one mode.
- **Don't** use the trophy metals (bronze, silver, gold, platinum) for anything but grade and rank.
- **Don't** put white text on an accent fill; use `background`.
- **Don't** set text sizes in px; they ignore the user's text-size setting.
- **Don't** put `overflow: hidden` on the element that owns a hover glow or shadow.
- **Don't** hard-code dark hex overlays (such as `#0a0d13` gradients) in new components; use `from-background` so light mode and OLED stay coherent.
- **Don't** use platform brand colours outside platform-identity contexts.
- **Don't** invent testimonials, user counts or figures; landing proof comes from the live database queries only.
