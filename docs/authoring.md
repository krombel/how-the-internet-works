# Authoring content

Everything the reader sees is a folder under `content/`. This guide shows how to add each kind of thing. Adding a
folder never needs an engine change; if one seems to, open an issue. [architecture.md](architecture.md) explains how
the pieces fit together.

**The dev loop:** `npm run dev`, then edit and save.
- Mistakes show up in the browser's error overlay and the console, with the file, the field and a suggestion:

  ```
  content/places/desk/place.ts › hops[1].link: "ethernett" is not a technology. Did you mean "ethernet"? Known: backbone, ethernet, gpon, …
  content/nodes/laptop/node.ts › strings: missing English string "node.laptop.name" (in content/nodes/laptop/locales/en.json)
  ```

- `npm test` runs the same checks, plus a walk through every place × activity. `npm run check:content` also prints translation coverage.

**Rules that keep content pluggable:**
- **Folder name = id.** Use lower-case kebab-case (`cell-tower`).
- **Imports.** Definition files (`*.ts`) import only from `$core/define` and relative files. Svelte files import only from `$core/api` and relative files. A test enforces this.
- **Strings.** Every folder has `locales/en.json`; other languages are optional and fall back to English per string. Keys are namespaced for you: `content/nodes/laptop/locales/en.json` → `node.laptop.*`.
- **Levels.** Any string can be split by level: `"kid": "…", "nerd": "…"`, or `"stop": { "router": { "kid": …, "nerd": … } }`.
- **Addresses.** Use the documentation ranges: 192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24 for public addresses; 192.168.x, 10.x and 100.64/10 (CGNAT) for private ones.

## Worked example: a laptop on a cable at the desk

This was added in one content-only commit ("Content only: a laptop on a cable at the desk"). It is two folders.

**1. The node:** `content/nodes/laptop/`

```ts
// node.ts
import { defineNode } from '$core/define';
export default defineNode({
  kind: 'device',
  role: 'endpoint',             // opens every layer, like the phone
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Laptop', title: 'Laptop', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/B%C3%A6rbar_computer', title: 'Bærbar computer', level: 'both', lang: 'da' },
  ],
});
```

```svelte
<!-- art/Device.svelte: a body in a 200×200 box, in the theme's vocabulary -->
<svelte:options namespace="svg" />
<script module lang="ts">
  export const face: [number, number] = [100, 86];   // where a theme may draw a face
</script>
<rect class="body peach" x="34" y="30" width="132" height="104" rx="14" />
<rect class="screen" x="47" y="43" width="106" height="78" rx="8" />
…
```

```json
// locales/en.json (and da.json…)
{ "name": "Laptop", "yours": "your laptop", "kid": "A computer you can fold shut…", "nerd": "An endpoint like the phone, but wired…" }
```

**2. The place:** `content/places/desk/`

```ts
// place.ts: hops and links alternate, from the reader's device to where it joins the shared segment
import { definePlace } from '$core/define';
export default definePlace({
  order: 3,                                                  // position in "Where are you?"
  hops: [
    { at: 'laptop', addr: '192.168.1.40' },
    { link: 'ethernet', km: 0.003 },                         // an existing technology: its stack, look, colour and dive (copper); `km`: roughly how long
    { at: 'router', addr: '192.168.1.1', natTo: '203.0.113.7:61757' },
    { link: 'gpon', km: 1.2 },                               // its dive (the fibre scene in GPON mode) comes along
    { at: 'cabinet', in: 'internet', owner: 'isp' },         // `in`: shown when the internet is unfolded; `owner`: whose network it is
    …
    { link: 'backbone', km: 25 },                            // ends with the link into the activity's next segment
  ],
  entry: { internet: 'home' },                               // inside the internet, the house stands for "where you came from"
  layout: {
    overview: {
      landscape: { nodes: { laptop: [420, 575, 220], router: [1010, 580, 200] }, links: { 'laptop-router': { bend: -0.18, label: [0, 60] } } },
      portrait:  { nodes: { laptop: [300, 1320, 260], router: [560, 900, 230] } },
    },
    internet: { … },
  },
});
```

```svelte
<!-- art/Backdrop.svelte: optional. This one reuses the house and adds a desk -->
<script lang="ts">
  import { Depth, type PlaceBackdropProps } from '$core/api';
  import House from '../../home/art/Backdrop.svelte';
  let props: PlaceBackdropProps = $props();
</script>
<House {...props} />
<Depth d={1.03}> … the desk … </Depth>
```

```json
// locales/en.json: the place's name, its overview text, and what it says about stops in its own context
{
  "name": "At the desk",
  "kid": "No radio this time: …", "nerd": "Wired: Ethernet frames go straight …",
  "tag":  { "laptop": "Ethernet · 192.168.1.40" },
  "stop": { "laptop": { "kid": "The laptop wants a video too. …", "nerd": "…" } }
}
```

That is all. The picker now offers "At the desk" in every activity. Catching a packet shows an Ethernet frame on
the first hop and the NAT at the router, and `#/en/desk/watch-video/internet/home-cabinet` flies three levels down.

## Add a node

`content/nodes/<id>/`:
- `node.ts`: `kind` is `device`, or `network` for a group that unfolds into its own path scene (list it in the activity's `groups`). Add a default `role` and `learnMore`.
- `art/Device.svelte`: optional; without it the theme draws a plain fallback body. Draw in a 200×200 box with the vocabulary classes: `body`, `peach`, `orange`, `teal`, `berry`, `cloud`, `screen`, `hi`, `button`, `accent`, `line`, `thin`, `wave`, `roof`. Export `face` if a face fits.
- `locales/en.json`:
  - `name` (required) and `kid`/`nerd` (the caption when it's the stop)
  - optionally `tag` (a small technical label in nerd mode) and `yours` ("your phone", used when this is the reader's device)
  - for network nodes, `inside` (`title`, `kid`, `nerd`) for the unfolded scene

## Add a technology

`content/technologies/<id>/technology.ts`:

```ts
defineTechnology({ look: 'radio' | 'cable' | 'fibre' | 'trunk', colour: '#rrggbb', stack: ['<layer>', …], dive?: '<scene>', learnMore })
```

- `stack` holds the **lower** layers, outermost first; the activity's flow adds IP and above. A link can override it (`{ link: 'metro-fibre', stack: ['ethernet', 'gtp'] }`).
- `look` picks how every theme draws the link, so a new technology needs no theme change.
- Strings: `name` (the link label), `kid`/`nerd`, and optionally `tag`.
- Every technology needs a `dive` (its signal: an existing scene with per-technology strings, or a new one), and every
  layer in its `stack` a layer dive, so a reader can always go all the way down (a content test checks this).
- Consecutive links with the same technology (and the same dive) are **one sideways stop** at dive level: they are one
  dive, with one magnifier on its links (placed clear of the devices and their names) and a "2 stretches · via …" line in its caption (issue #34). To make a stretch its own stop, give it its own technology
  or its own `dive` (the undersea cable would be a `submarine` technology, not a backbone link with a note).

## Add a layer (issue #5)

`content/layers/<id>/`:
- `layer.ts`: `defineLayer({ fields, openAt?, seals?, tunnel?, code?, bytes?, dive?, learnMore })`.
  - `fields`: its header, in wire order (see below).
  - `openAt`: the roles that read it (TCP, TLS and HTTP: `['endpoint']`). Everyone else leaves it closed. The default
    is everyone.
  - `seals: true`: what's inside is encrypted for every hop that doesn't open this layer (TLS).
  - `tunnel: true`: its addresses are the ends of the run of links that carry it, and the link frames around it end
    there too (GTP‑U: cell tower ↔ mobile core).
  - `code`: how outer layers name this one, e.g. `{ ethertype: '0x0800 (IPv4)', ipproto: '6 (TCP)' }`.
  - `bytes`: size not described by `bits` (a text header, a body), `{ up, down }`.
  - `dive`: a layer dive scene (see below): its envelope in the peek gets a magnifier that flies into it.
- Strings: `name` and `note` (levelled), `line` (the one-line summary in the detail tree, with `{fieldId}` values),
  `sealed` (optional, levelled: what kids read on it where it's closed), and per field
  `field.<id>.name` (levelled) and `field.<id>.about`.

Then reference it from a technology `stack`, a link override, or a flow `stack`.

### Add a header field

A field is `{ id, bits?, value, use?, kid? }`:
- `bits`: its size on the wire. Give every field `bits` and the detail view draws the header diagram.
- `value`: a template. Plain text is the same on every hop (`'4'`, `'010 (DF)'`); `{ up, down }` differs by direction;
  facts fill in per link: `{src}` `{dst}` `{sport}` `{dport}` `{ttl}` `{mac.src}` `{mac.dst}` `{mac.tx}` `{mac.rx}`
  `{tunnel.src}` `{tunnel.dst}` `{len}` `{payload}` (`{payload+8}`) `{sum}` `{crc}` `{label}` `{inner.<code>}` (see
  [architecture](architecture.md#the-packet-model-modelpacketts)). `'@ask'` shows the string `value.ask` instead. An
  empty value leaves the field out in that direction.
- `use`: the roles that act on it when the packet arrives (`['router', 'nat']` for TTL), or `true` for every hop that
  receives the layer. Used fields are highlighted; kids see only used, changed or new fields.
- `kid`: show it to kids: `true` (addresses become names like "your phone") or a kid value.

```ts
{ id: 'ttl', bits: 8, value: '{ttl}', use: ['router', 'nat'], kid: true },
```

```json
"field": { "ttl": { "name": { "kid": "Steps left", "nerd": "Time to live" }, "about": "Each router takes one off; at 0 the packet is dropped." } }
```

Nothing is written per hop: values change because the route changes (a NAT's `natTo: 'addr:port'`, a router's TTL, a
bridge passing a frame on, a tunnel starting). The validator names unknown facts, codes and missing strings.

## Add a dive scene

A dive scene explains a link (`explains: 'link'`, the default: Wi-Fi, copper, fibre, 5G) or a layer at one hop
(`explains: 'layer'`, next section). Technologies and links may only point at link scenes, layers only at layer scenes.
A link scene is the **signal world**: no envelopes, only bits as waves, light or electricity; *how do the bits
move?* A layer scene is the **paper world** of envelopes and stickers; *who is this for, how is the road shared,
did it arrive intact?* Keep that split so the two don't become near-duplicates.

`content/scenes/<id>/`:
- `scene.ts`: `defineScene({ learnMore })`.
- `Scene.svelte`: gets `{ subject }`: the link it explains, with `subject.link.tech`, `subject.link.stack`, and its hops via `subject.route.hops[subject.link.from]`. It draws in the scene world (landscape 1600×900, portrait 900×1600; read `view.orient`). Build it from:
  - `view.time` and `view.level`
  - `Node` (a device in the current theme)
  - `Text` (text that stays readable at any zoom)
  - `TagAt`
  - its own `art/*.svelte` and maths files
- Strings: `title` (required) and `kid`/`nerd`. Per-technology variants such as `gpon.title` or `gpon.kid` win when the subject is that technology.
  When one scene explains several technologies that can sit next to each other on a route, give each its own
  `<tech>.title` and draw the difference: a reader steps from one stretch to the next and should see what changed (a
  content test checks the titles differ). `fibre-light` picks a mode from `subject.link.tech` (`light.ts` › `modeOf`):
  **access** (GPON: a splitter shares one thread with the street, the light coming home reaches every house, the houses
  take turns going up), **metro** (DWDM colours with mux and demux; the exchange's cross-connects too, with their own title and a LAN-WDM tag) and **long haul** (the backbone: eight colours, a
  booster every 80 km). Each mode is its own component with portrait, landscape and short-landscape layouts.
- The caption adds **What it carries** chips by itself, one per layer in `subject.link.stack` that has a dive, and
  the dives of those layers get a **How it travels** chip back to this scene; the title names it there, so make it
  say what the signal is ("Electricity in copper").

Point a technology's `dive` at it, or a single link's `dive`.

## Add a layer dive

A layer dive is one layer as seen at one hop: IP at the home router, TCP at your phone. Readers get there by tapping a
magnifier on an envelope in the peek panel (or by URL: `#/en/home/watch-video/router~ip`), and step up and down the
stack of the same hop with the ▲/▼ buttons, a vertical flick or the arrow keys. **One scene serves every hop**, so it
adapts to where it is opened rather than having near-duplicates (the IP dive is a signpost at a router, a swap
notebook at a NAT, a carrier-grade NAT at the mobile core, an envelope swap at a bridge, a door plate at an endpoint).

`content/scenes/<id>/`:
- `scene.ts`: `defineScene({ explains: 'layer', learnMore })`.
- `Scene.svelte`: gets `{ subject }`, a `LayerSubject` (`import type { LayerSubject } from '$core/api'`):
  - `subject.layer`: the layer id; `subject.open`: whether this hop reads it (else it is sealed here);
  - `subject.ctx`: the hop's `LayerCtx`: `to` (this hop, with its `role`), `link` (the link
    it arrived on), `client`/`server`, `src`/`dst`, `nat`, `ttl`, `dir`, `flow` and `level`;
  - `subject.route`: the whole route (`chain`, `links`, `asides`, `activity`), to build what the hop knows from it
    (the IP dive derives a router's signposts from the next and previous hops).
- Vary by context, most general first: `subject.open` (open vs sealed), `ctx.to.role` (`endpoint`, `nat`, `router`,
  `bridge`), then facts (`ctx.nat`, the link's `stack`). Avoid naming node ids.
- Draw it like the other layer dives so they read as a family: a road along the bottom with the client, the server
  and this hop (`Node`, focused) and names under them (`nameOf`); paper cards above it for the close-up; big
  walking parcels. Keep the flap at the top centre of the panel empty (the envelope panel is drawn there).
  Portrait (900×1600) and landscape (1600×900) are both needed; a short landscape screen (a phone on its side)
  benefits from a compact layout with bigger text and fewer labels (see `layoutFor` in `scenes/ip-post/post.ts`).
  Text never draws smaller than the theme's minimum on screen, so check the portrait phone for overlaps.
  That holds for `Text` and `Label`; raw `<text>` (inside a drawing) doesn't, so size it with `legibleSize()` from
  `$core/api` (`const legible = legibleSize()`, then `legible(36)` is 36 or the world size that shows as the minimum;
  inside a group scaled by `k`, use `legible(36 * k) / k`) and let its box grow with it. In short landscape 14 px is
  about 42 world units: hide detail that can't be that big (draw an envelope's rows as lines, shorten long values).
- Loop on `view.time` with a pure maths file (as `ip-post/post.ts`), so screenshots at a fixed clock are stable.
- Strings (`locales/en.json`, `da.json`), looked up most specific first for `title` and `kid`/`nerd`:
  1. `at.<node id>` (one hop, e.g. `at.mobile-core` for carrier-grade NAT)
  2. `role.<role>` (e.g. `role.nat`)
  3. `sealed` (when this hop can't open the layer)
  4. the plain `title`/`kid`/`nerd`

  Each is looked up first under the layer (`<layer>.at.<node id>`, `<layer>.role.<role>`, `<layer>.sealed`,
  `<layer>`), so **one scene can serve several layers** by switching on `subject.layer` (`sticker-doors` is
  Ethernet, VLAN and MPLS: the same box of doors with a different book).
  `{hop}` (this hop's name), `{yours}` ("your phone") and `{layer}` are filled in. Scene labels are your own keys,
  read with `strings('scene.<id>')`; nerd callouts conventionally live under `tag.*`.
- A link layer (one in a technology's `stack`: Wi‑Fi, Ethernet, GPON…) is the envelope for one stretch; its dive
  gets a **How it travels** chip down to that link's signal by itself. End kid texts with a line bridging down
  ("Underneath, it travels as flashes of light").

Then set `dive: '<id>'` in `content/layers/<layer>/layer.ts`. The layer panels of a hop stack vertically around it in
its path scene, so nothing else needs a layout. Dive scenes are loaded on demand, so they cost nothing at start-up.

## Add a segment

`content/segments/<id>/segment.ts`: `defineSegment({ hops, aside?, entry?, layout? })`. It is a reusable stretch of route that activities list in `route`. `aside` adds a dashed alternative branch that packets don't take (transit).

## Add an owner (issue #20)

The internet is a network of networks. `content/owners/<id>/owner.ts` (`defineOwner({})`) is a company that runs
some of the hops: your internet company, the exchange, the video company, a transit carrier. Its only string is
`name`, split by level (`"name": { "kid": "Your internet company", "nerd": "Your ISP · AS64500" }`; use the
documentation AS numbers 64496–64511).
- A hop (or `aside`) says `owner: '<id>'`. Inside a group, the hops of one owner get a tinted, rounded region, and the
  owners on the packets' way are named on a sign; a side branch's region stays faint and unnamed. The tone is the
  owner's place along the route, so it is the same colour in every scene.
- A layout may place the signs: `owners: { isp: [x, y] }` next to `nodes`; the region reaches out to the sign.
  Without one, the sign sits on the region's top edge.
- Give every link a rough `km`. The caption turns them into the trip's scale: how far the video is, how many
  companies carry it, how far a stop is from you and how long a link is (with light's time in fibre for nerds).

## Add a place

`content/places/<id>/`: as in the worked example.
- `place.ts` (`definePlace`) starts with the reader's device and ends with the link into the activity's next segment.
- `art/Backdrop.svelte` is optional.
- Strings: `name` (required), `kid`/`nerd`, `tag.<instance>`, `stop.<instance or link id>`, and `inside.<group>`.

Validation checks that the place makes a well-formed route with every activity. To keep an activity to some places,
use `only: [...]` on its place slot.

## Add an activity

`content/activities/<id>/activity.ts`:

```ts
defineActivity({
  route: [{ place: 'me', default: 'home' }, { segment: 'isp-to-cdn' }],
  groups: ['internet'],
  flows: [{ id: 'video', stack: ['ip', 'tcp', 'tls', 'http'],
            packets: [{ kind: 'request', dir: 'up', pace: 1.2, colour: '#ffcf5d' }, { kind: 'video', dir: 'down', pace: 1.3, every: 1.3, colour: '#bf6f8f' }] }],
  layout: { overview: { landscape: { nodes: { internet: [1380, 360, 250] } } } },
})
```

Strings:
- `title` and `kid`/`nerd`: keep them device-neutral ("You ask for a video"), since any place can start it
- `peek.<kind>` ("Caught: a piece of video")
- `stop.*`

## Make art mode-aware (day and night, issue #43)

Storybook has a day and a night mode. The reader's OS setting picks the default; the ☀️/🌙 button and `?mode=day|night`
switch it. Night repaints everything through tokens, so art that follows these rules works at night without
extra effort:
- **Colours come from the theme's palette:** `fill="var(--peach)"`, `stroke="var(--line)"`,
  `style="color: var(--teal)"`. Never write a literal (`#ffcf5d`, `rgb(…)`, `white`). The palette is at the top of
  `content/themes/storybook/tokens.css`, and night overrides it in the `[data-mode='night']` block. If no
  colour fits, add a token to the day block and give it a night value.
- **Some tokens are lights,** plain by day and lit at night. Use them where something glows after dark:
  - `--window`: a window pane
  - `--room`: a lit room seen from outside
  - `--lamp`: a lamp head or headlights
  - `--shade`: a drop shadow. At night it is near black, not brown.
- **For elements that only exist at night** (stars, a lamp's pool of light, a halo around a wave), wrap them in
  `{#if view.mode === 'night'}`. Draw halos as a wider, translucent copy of the stroke. Don't use SVG filters: they
  cost too much at 6× throttle and don't fit the paper look. A device's `accent` part (an LED) glows at night by
  itself.
- **Some colours really are fixed,** such as a fibre wavelength's colour or the T568 insulation colours of copper
  pairs. Mark them with a comment that starts with `fixed-colour:` and gives the reason:
  - on its own line, it covers the lines after it, up to the next blank line
  - at the end of a line, it covers that line only

  Data colours (a technology's or a packet's `colour`) are identity, not paint, and stay literal in the definition files.
- **Tests check the rules:**
  - `art-colours.test.ts` flags literals in `content/**` art. It also checks that every `var(--x)` exists in the
    theme's day tokens, and that night only overrides tokens the day defines.
  - `contrast.test.ts` checks the chrome's text pairs (caption, chips, peek, tags, buttons, links, labels) for WCAG AA
    in both modes.
- Look at it at night: `npm run dev`, then add `?mode=night` to the URL. `npm run evaluate -- --mode=night` takes the
  night screenshots and perf.

## Add a language

1. `content/locales/<lang>/meta.json`: `{ "name": "Dansk", "dir": "ltr" }` (`rtl` for Arabic, Hebrew…). `name` is
   written in the language itself; it also tells the theme which script's fonts to load.
2. `content/locales/<lang>/ui.json`: the chrome strings (copy `en/ui.json`).
3. Add `locales/<lang>.json` to any content folder you translate. Anything missing falls back to English.
4. A new script (Arabic, Greek…) needs its font faces in the theme's `tokens.css`.

We ship only languages someone has reviewed (English and Danish for now, issue #11).

The language appears in the switcher at once and loads as its own small chunk. `npm run check:content` shows the coverage.

## Add a learn-more link (issue #4)

Add it to the `learnMore` list of the definition it explains (node, technology, layer, scene, place or activity):

```ts
{ url: 'https://da.wikipedia.org/wiki/5G', title: '5G', level: 'kid' | 'nerd' | 'both', lang: 'da' }
```

`title` is in the language of the page. The caption shows up to three links for the reader's level:
- in their own language first
- English nerd links always stay (marked "(en)")
- other English links only when there's nothing in their language

## Checklist

- [ ] The folder name is the id; every hop, link and layer name exists (the dev overlay says what doesn't).
- [ ] `locales/en.json` has the required strings; `da.json` if you can.
- [ ] Layout for both `landscape` and `portrait` on every path scene the item appears in (and in dive scenes).
- [ ] A new technology has a `dive`, and each layer in its `stack` a layer dive (all the way down).
- [ ] Art uses palette tokens, not colour literals, and looks right at night (`?mode=night`).
- [ ] `npm test` and `npm run build` pass; have a look in `npm run dev` in both orientations.
- [ ] `npm run evaluate` if it adds animation (budget: p95 within one frame at 6× CPU throttle).
