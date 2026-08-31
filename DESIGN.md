# Design

## Source of truth

- Status: Draft
- Last refreshed: 2026-08-31
- Primary product surfaces: GitHub profile `README.md`; local `profile-preview.html`
- Evidence reviewed: current repository `README.md`; `.github/workflows/comet-graph.yml`; AlexOxytocin GitHub profile; `ks-design.art` landing page at `http://localhost:4621/#services`; current `kiaquila` repository metadata for Ember, Dreamboard, Alex Neon, and Mikhail Orlov

## Brand

- Personality: bold, art-directed, memorable, direct, aesthetically exacting
- Trust signals: nine-plus years in web development; finished live projects; an explicit, human process; an active contribution graph; live follower and project-star badges
- Avoid: generic AI language, template-like claims, price lists, technology inventories, decorative badge walls beyond the single compact intro widget, or a splash/banner image in this draft

## Product goals

- Goals: make Kristina's hybrid design/development/illustration practice legible in seconds; show distinctive work; turn profile visitors into portfolio visits or email conversations
- Non-goals: exhaustive CV, technology stack, pricing, social-link directory, case-study detail
- Success signals: visitors understand the offer, open a selected project, visit the portfolio, or start an email

## Personas and jobs

- Primary personas: founders, small teams, experts, and creative businesses looking for a distinctive web presence
- User jobs: understand what Kristina does; judge the visual/product range; see how collaboration works; find a direct contact path
- Key contexts of use: desktop and mobile GitHub profile browsing, often scanned quickly

## Information architecture

- Primary navigation: linear README flow with inline project and contact links
- Core routes/screens: one GitHub profile README; one local HTML preview
- Content hierarchy: positioning → offer → selected proof → process → promise/contact → contribution signal

## Design principles

- Lead with a specific promise: memorable, non-generic AI-assisted web design and illustration
- Make proof easy to scan: four projects, ordered by the user's priority, with one outcome-focused sentence each
- Keep the profile human: plain English, short paragraphs, concrete process, no stack theatre
- Tradeoffs: clarity and personality take priority over comprehensiveness; GitHub-native rendering takes priority over custom layout

## Visual language

- Color: inherit GitHub theme; the generated contribution sky supplies the cinematic accent
- Typography: GitHub-native Markdown hierarchy; local preview mirrors GitHub's system type stack
- Spacing/layout rhythm: short sections separated by clear headings and restrained rules
- Shape/radius/elevation: GitHub-native table treatment; subtle cards only in the local preview
- Motion: none in profile copy; contribution asset provides its own motion and includes a reduced-motion source
- Imagery/iconography: no hero/splash image; contribution sky plus a restrained Shields.io badge strip matching the reference profile

## Components

- Existing components to reuse: generated comet contribution `<picture>` block and reduced-motion fallback
- New/changed components: three-badge intro widget for followers, Unicorn Hub stars, and email; two-column services table; two-column projects table; numbered process list; two-link contact line
- Variants and states: GitHub light/dark themes; reduced-motion contribution image
- Token/component ownership: GitHub owns production rendering; `profile-preview.html` owns preview-only CSS

## Accessibility

- Target standard: semantic Markdown/HTML with readable contrast inherited from GitHub
- Keyboard/focus behavior: all links remain native anchors
- Contrast/readability: avoid text rendered inside images; keep paragraphs short
- Screen-reader semantics: meaningful headings, table headers, link labels, and contribution image alt text
- Reduced motion and sensory considerations: preserve the existing `prefers-reduced-motion` asset source

## Responsive behavior

- Supported breakpoints/devices: GitHub desktop and mobile layouts
- Layout adaptations: Markdown tables scroll or reflow according to GitHub; local preview collapses tables into stacked blocks on narrow screens
- Touch/hover differences: links never rely on hover alone

## Interaction states

- Loading: contribution image may load after copy; all essential content remains available
- Empty: not applicable
- Error: broken external project links remain understandable from their visible labels and descriptions
- Success: link navigation to live project, portfolio, or email client
- Disabled: not applicable
- Offline/slow network, if applicable: profile copy remains useful; the remote contribution image may be unavailable

## Content voice

- Tone: confident, warm, concise, visually minded
- Terminology: “What I do,” “Selected projects,” and “How the work goes” are canonical section names
- Microcopy rules: use active voice; describe tangible deliverables; avoid “cutting-edge,” “innovative,” “solutions,” and generic AI superlatives

## Implementation constraints

- Framework/styling system: GitHub-flavored Markdown with minimal inline HTML
- Design-token constraints: GitHub controls the production theme; preview CSS must not imply unsupported README styling
- Performance constraints: no new heavy assets; reuse the existing remotely generated contribution SVG and lightweight dynamic Shields.io badges
- Compatibility constraints: public GitHub profile rendering, dark/light theme, and reduced motion
- Test/screenshot expectations: inspect local HTML in Chrome; verify link targets, section order, responsive layout, and contribution image fallback

## Open questions

- [ ] Decide whether a custom banner should be introduced in a later version; intentionally excluded from this draft.
