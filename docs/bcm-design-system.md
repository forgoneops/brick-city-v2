# BRICK CITY MASHIN' — DESIGN SYSTEM v2
### Codename: "SIDE ALLEY" — nous-branding × street. Clean. Professional. Mysterious.

## 0. RESEARCH FINDINGS (validated direction, 2026-08)
- **A-COLD-WALL\* (Samuel Ross)** — proof that brutalist, working-class street language CAN be
  high fashion: material exploration, asymmetry, restraint. That's exactly the "nous × street"
  collision we want. Lesson: treat concrete/brick as *material study*, not decoration.
- **Off-White (Virgil Abloh)** — the masterclass: luxury built from borrowed street signage
  (Glasgow airport wayfinding, diagonal hazard stripes, Helvetica labels "IN QUOTES").
  Two takeaways we adopt:
  1. **Own ONE recognizable street motif** (theirs: diagonal stripes) — ours: **the stencil
     bridge-gap** — a thin horizontal cut through logos, icons, dividers. Instantly ours.
  2. **Label things in mono with quotes/coordinates** — `"GALLERY"`, `WAW-044`, like evidence
     tags. Turns UI into archival documentation. Already in our system → now it's doctrine.
- **Brutalist web (brutalistwebsites.com / Awwwards brutalism)** — the good examples share
  one trait: raw structure, ZERO decoration-for-decoration, confident typography. We keep the
  confidence, skip the "ugly on purpose" part — mystery ≠ hostile.
- **Stencil typography research** — real stencil type has visible *bridges*; cartoon graffiti
  fonts don't. Our custom display face must be cut like a plate, never a "graffiti" Google Font.
Conclusion: SIDE ALLEY direction confirmed. Adjustments folded into tokens below.

## 1. CONCEPT
Not a kid's sticker wall — a **midnight gallery in a side alley**. The restraint of a high-end
brand studio (nous-style: space, silence, precision) colliding with street texture (grain,
concrete, spray). Think: a Swiss design poster wheat-pasted on a wet brick wall at 2 AM.
Mystery comes from **what's withheld**: lots of dark space, sparse color, details that reward
attention. Nothing cartoonish, nothing SaaS.

**Three words: RESTRAINT · TEXTURE · MYSTERY**

## 2. DESIGN TOKENS

### Palette — "Wet Asphalt"
```
--ink:        #0c0c0d   /* near-black, page bg */
--asphalt:    #131315   /* surfaces */
--concrete:   #1b1b1e   /* cards */
--fog:        #26262a   /* borders, hairlines */
--bone:       #e6e2d8   /* primary text — warm off-white, never pure white */
--smoke:      #7a766c   /* secondary text */
--signal:     #d4ff3f   /* THE accent — acidic spray-can yellow-green. Used RARELY (5% rule) */
--blood:      #8f2d23   /* brick/oxide red — secondary accent, warnings, stamps */
--rust:       #b0552f   /* tertiary, hover states on texture elements */
```
Rules: 90% monochrome (ink→bone), 5% signal, 5% blood/rust. Signal appears only on
primary CTAs, active states, and one hero detail. Never gradients of two accents.

### Typography
- **Display / logo**: **"Dusk Till Dawn" (Comicraft, John Roshell)** — gothic-noir display
  family (4 cuts: Risen / RisenUp / Buried / BuriedDeep; known from "What We Do in the
  Shadows" logo). Used ONLY for: logo wordmark, hero headline, section titles, 404.
  Rules: uppercase, tight tracking, never below 28px, always bone or signal on ink.
  ⚠️ COMMERCIAL FONT — buy family license (~$49) + **webfont license** before deploy.
  **Fallback ladder (similar vibe, free):**
  1. **Big Shoulders Stencil** (Google Fonts, OFL) — stencil bridges = matches our
     BRIDGE-GAP motif perfectly; condensed, confident, zero cost → DEFAULT until licensed
  2. **Saira Stencil One** (Google Fonts, OFL) — rounder stencil, good alt for headings
  3. **Grenze Gotisch** (Google Fonts, OFL) — blackletter edge, closest to DTD's gothic
     noir feel for the logo wordmark if we lean darker
  4. Oswald — last-resort system-safe
  CSS: `font-family:'Dusk Till Dawn','Big Shoulders Stencil','Grenze Gotisch','Oswald',sans-serif`
- **Headings**: condensed grotesque (e.g. "Oswald" / "Archivo Expanded" class), uppercase, letter-spacing -0.02em
- **Body**: neo-grotesque (Inter / Space Grotesk class), 15px, line-height 1.6, color smoke→bone
- **Mono accents**: labels, timestamps, coordinates in mono (JetBrains Mono class), 11px,
  letter-spacing .18em, uppercase — the "forensic tag" look: `SPOT / WAW-044 / 52.23N 21.01E`

### Texture layer (always subtle, opacity ≤ 8%)
- Global film grain (SVG noise, fixed)
- Concrete mottling on cards — generated, not stock photos
- Hairline scratches along section dividers
- One (1) spray overspray element per viewport max — like a signature, not wallpaper

### The Ownable Motif — "BRIDGE-GAP" (research-derived)
Like Off-White's diagonal stripes: one repeated signature that makes anything unmistakably BCM.
- A 2-3px horizontal **cut** through display type, logo, section dividers, icon plates
- On scroll-reveal, headings animate as two halves sliding together across the gap (300ms)
- Used on: logo, hero heading, footer wordmark, admin login, section titles. Never on body text.

### Shape language
- Radius: 2px max (nearly sharp) — bricks don't have rounded corners
- Borders: 1px fog hairlines everywhere; no shadows except one deep ambient on overlays
- Buttons: rectangular, bone text on asphalt; hover = 1px signal border + text shifts to signal; primary = signal bg, ink text
- Icons: 1.5px stroke, geometric, slightly imperfect (hand-cut stencil feel), drawn on 24px grid

## 3. LOGO — "THE MARK"
Concept: **BCM monogram as a stencil plate + wordmark**
- Monogram: letters B C M cut as one stencil plate — bridges visible (like real stencils),
  drawn on a strict grid, slight rotation -2° as if sprayed in a hurry but by a steady hand
- Wordmark: `BRICK CITY MASHIN'` in condensed grotesque, the apostrophe doing the talking
- Tagline slot (mono, tiny): `EST. ON CONCRETE` / coordinates of the first spot
- Variants: full lockup / monogram only (app icon, favicon) / wordmark only (footer)
- Color: bone on ink, or signal monogram + bone wordmark. Never more than 2 colors.
- Files: `logo-full.svg`, `logo-mark.svg`, `logo-word.svg` + favicon set

## 4. ICON SET — "CUTOUTS"
Custom stencil-cut SVG icons, 24px grid, 1.5px stroke, bridges/gaps like stencil plates:
spray-can, wall-brick, pin-folded, zine-page, crown-stencil, mask (for anonymous),
lantern (events), scale (ranking), thread (forum), vault (wallet), key (invites),
eye-off (mystery/hidden), gate (admin), drip-dot (notifications).
Rule: every icon has ONE intentional stencil gap. Set file: `icons.svg` sprite.

## 5. SIGNATURE COMPONENTS
- **The Alley Hero**: full-viewport ink darkness, logo mark stenciled huge at 6% opacity
  behind content, single signal-colored CTA, coordinates ticker in mono at the bottom edge
- **Wanted-poster cards**: gallery items as archival evidence — mono metadata strip
  (author/cat/coords) under each piece, hairline frame, props = small stamp icon
- **Stamp interactions**: approving something in admin = a blood-red stencil stamp
  animation slamming onto the row (200ms, subtle, satisfying)
- **Side-alley nav**: public nav as vertical mono list on desktop edge; mobile = bottom bar
- **404 = dead end**: brick wall, single lantern glow, "WRONG ALLEY" stenciled

## 6. MYSTERY SYSTEM (the nous part)
- Hidden layer: coordinates of legendary spots revealed only to paying members (blurred
  pins on map with mono text `MEMBERS ONLY`)
- Invite page = black screen, single input, signal caret, mono whisper: `YOU HEARD ABOUT US SOMEWHERE`
- Easter egg: konami-style key sequence sprays a hidden tag onto the footer
- Empty states never cheerful — short, dry, mono: `NOTHING HERE. YET.`

## 7. ANTI-PATTERNS (hard bans)
- No emojis anywhere · No rounded SaaS cards · No purple-blue gradients
- No stock 3D illustrations · No cheerful empty states · No glassmorphism
- No more than 1 accent color per view · No drop shadows on cards
- No childish drip/cartoon graffiti fonts — the stencil is custom, not a Google Font "graffiti" face
