# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Trophy hunters: players who already chase platinums and 100% completions and play on more than one platform (PlayStation, Xbox, Steam, Epic). They arrive wanting one place that shows everything, tells them what to go for next, and lets them measure themselves against friends.

## Product Purpose

Paragon unifies trophies and achievements from PSN, Steam, Xbox and Epic into a single profile and a single Paragon level, and turns hunting into a social, competitive activity. Success: a hunter links their accounts, sees their next reachable platinum, and keeps coming back to compete in leagues, clan wars and friend challenges.

## Positioning

- **Everything unified**: PSN + Steam + Xbox + Epic in one profile and one level — single-platform trackers (PSNProfiles, TrueAchievements, Exophase's per-platform views) can't claim one cross-platform identity.
- **Social and competitive**: monthly leagues, seasons, clans and clan wars, friend challenges, community feed — "a club, not an automatic spreadsheet".
- **Tells you what to do next**: closest platinum, optimal route, missable trophies, backlog planner.
- **No passwords**: linking is just pointing at your public profile; the server reads it with its own credentials.

## Operating Context

Hunters check Paragon between gaming sessions on desktop and phone (installable PWA, native Android app). Data comes from our database, synced daily and on demand from the platforms' public profiles.

## Capabilities and Constraints

- Next.js 16 App Router, Tailwind, next-intl with 4 interface languages (es, en, de, fr); all landing copy lives in message files.
- Dark theme by default with alternative modes (light, OLED, high contrast) and user-chosen accent and "style" (lib/apariencia.ts); `globals.css` is global to the whole app.
- Every clickable control must have a visible hover state (standing user rule).
- Epic provides no playtime; Google Play/Nintendo are not supported.

## Brand Commitments

- Name **Paragon** and the existing logo (`public/logo.jpg` and header mark).
- Not affiliated with Sony, Microsoft or Valve (stated in the footer).
- Voice: direct, a bit cheeky, Spanish-first ("no es un Excel automático, es un club").

## Evidence on Hand

Real, live data only: global stats, top hunters, rarest trophies of the week and recent platinums come from the database (`getGlobalStats`, `getTopHunters`, `getRarestTrophiesThisWeek`, `getRecentPlatinumActivity`). The user base is still small: no testimonials, press, or user counts beyond what those queries return may be invented. (User answered "todo puede" to the constraints question — no extra binding limits; truthfulness of figures stays as a default.)

## Product Principles

1. One identity across platforms beats depth on any single one.
2. Competition among friends is the retention loop; show people, not just numbers.
3. Always point at the next achievable goal.
4. Zero-friction trust: public profiles only, never credentials.
