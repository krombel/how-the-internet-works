# Accessibility (issue #53)

**Target.** WCAG 2.2 AA for the controls and navigation, and an *equivalent experience* of the picture: anything you
can learn or reach by looking and tapping, you can also learn or reach by keyboard, screen reader or listening.

The work comes in four slices:

| Slice | What | State |
|---|---|---|
| 1 | Pause everything, the automated check (axe + keyboard) in `npm run evaluate` and CI, focus and announcer fixes | done |
| 2 | A text map (list view) and the keyboard in the scene, sharing one focus model | to do |
| 3 | Spoken descriptions of each scene (`describe`, kid/nerd, every language) and read aloud from the 🔈 | to do |
| 4 | Not by colour alone, non-text contrast, `forced-colors`, targets and 200 % zoom (with #45) | to do |

## What works today

- **Pause.** ⏸ in the top bar, in every scene, freezes all motion: traffic, the dives (radio waves, light, copper,
  walking envelopes), the night sky and the doors' breathing (WCAG 2.2.2). It is remembered across reloads. Catching
  a packet pauses too; letting go resumes unless ⏸ is on. `prefers-reduced-motion` still removes the flights and the
  breathing as before.
- **Keyboard.** Everything in the chrome, the caption, the ladder, the peek, the ⋯ menu and the picker is a real
  button or link. Esc goes back up, closes a list, a menu or a dialog, or lets a caught packet go. ← → (▲ ▼ in
  portrait) step along, except inside the caption text when it scrolls (the arrows scroll it).
- **Focus is never lost.** After a door, a ladder rung or a step, focus goes to the new caption's heading if the
  control you used has gone (it never falls to the page or to something hidden). Catching a packet moves focus to the
  peek's heading, and letting go brings it back. The picker makes the page behind it `inert` and gives focus back to
  the button that opened it. Hidden parts (the caption during a flight or while a packet is caught) are `inert`.
- **Focus ring.** One two-tone ring for every control (`:focus-visible` in `ui/ui.css`): the theme's ink outside, the
  page colour between, so it shows on paper, sky and night (≥ 3:1, `model/contrast.test.ts`). A theme can recolour it
  (`--focus-ink`, `--focus-gap`) but not remove it.
- **Screen readers.**
  - Landmarks: the top bar is a `header`; the stage, caption and peek are `main`, under a visually hidden `h1`. The
    breadcrumb is a `nav` ("Where you are") with `aria-current="location"`.
  - `document.title` names the scene: "Radio waves · How the internet works".
  - **One announcer** (`ui/Announcer.svelte`, a visually hidden `role="status"`) says short lines instead of whole
    panels: on arrival the scene's title and the first sentence of its caption (`arrival`, `firstSentence` in
    `ui/announce.svelte.ts`); in the peek the hop ("Home router, 3 of 9. It swaps the address…"). Nothing else is
    `aria-live`.
  - Toggles keep their name and say their state with `aria-pressed` ("Pause all motion, pressed"). The kid/nerd
    buttons say which one is on. The ladder's lists and the crumbs are disclosures (`aria-expanded`), not menus.
  - A changed header field reads "60, was 61" (`ui/Change.svelte`) instead of the struck-through old value and the
    new one run together.
  - Learn-more links in another language than the page carry `lang`.
- **Contrast.** The chrome's text pairs, including the "Change" link and the peek's old and new values, meet AA in day
  and night (`model/contrast.test.ts`).

**Not yet** (slices 2–4): the picture itself has no text alternative (the stage SVG is `aria-hidden`; the caption
chips and the ladder are the way in), the scene can't be walked by keyboard stop by stop, hints name gestures
("Swipe…") but not keys, and colour carries meaning in places (owner regions, request vs response, fibre colours).

## How to check

```sh
npm run build && npx vite preview --port 5318 &
npm run evaluate -- --only=a11y               # day
npm run evaluate -- --only=a11y --mode=night  # night
```

It prints each problem and exits non-zero if there is one; it writes no screenshots or metrics. CI runs both (the
`a11y` job in `.github/workflows/ci.yml`). It checks:
- **axe-core** (WCAG 2.0, 2.1, 2.2 A and AA, plus best practice) on the overview, inside the internet, the Wi‑Fi,
  router and IP-layer dives, Danish nerd, a caught packet (and its details), the picker, the open ladder, the ⋯ menu
  and About, on a desktop, a portrait phone and a short landscape screen. **Zero violations** is the bar; there is no
  baseline of allowed ones.
- **Tab once round** each of those states: focus must never land on the page, on something inert, hidden or off
  screen, or on a control without a visible ring.
- **Journeys:** a door from the caption (focus stays somewhere visible), catching a packet (focus on the peek), Tab in
  the peek, letting go, ⋯ (focus in the menu, Esc back to ⋯), and the picker (Tab stays in it, Esc back to its button).

axe can't judge SVG text over art (it reports it as "needs review"); slice 4 covers the scene's own contrast.

## Manual checklist

The automated check can't hear what a screen reader says. Before a release that touches the chrome, the caption, the
ladder or the peek, walk this with a real screen reader. **Not yet done for slice 1.**

**VoiceOver on macOS** (Safari, ⌘F5):
- [ ] VO-U (rotor): landmarks "banner", "main", "Where you are" navigation; one heading level 1.
- [ ] Tab from the top: every control is named; ⏸, ☀️/🌙 say "pressed" / "not pressed", not a changing name.
- [ ] Open a door from the caption: you hear the new scene's title and first sentence once, and focus is on its
      heading (VO-→ reads on into the caption).
- [ ] Step with ← →: each stop's title is spoken once; nothing re-reads the whole caption.
- [ ] Catch a packet (its chip in the caption): focus moves to the peek; ◀ ▶ say "Home router, 3 of 9…"; a changed
      field says "…, was …"; Esc returns to where you were.
- [ ] Ladder: the current rung's list opens and closes ("expanded" / "collapsed"); Esc folds it.
- [ ] ⋯: a menu with Language (radio items), Sound (checkbox) and About; Esc returns to ⋯.
- [ ] "Change" (the place): a dialog; Tab stays in it; Esc returns to "Change".
- [ ] Switch to Dansk: the Danish voice is used for the page (and English for an English learn-more link).

**VoiceOver on iOS** (Safari, triple-click side button):
- [ ] Swipe through the top bar and the caption in portrait and landscape: nothing hidden is reachable, nothing off
      screen.
- [ ] Double-tap a caption chip: the new scene is announced; the next swipe starts in the new caption.
- [ ] ⏸ stops all motion, also inside a dive, and stays paused after a reload.

**TalkBack on Android** (Chrome): the same as iOS.

Record the date, browser and screen reader with the result here when it is run.
