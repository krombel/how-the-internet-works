# Plan: the time machine (issue #59)

Status: **revised 2026-10-02** after user feedback, before any more code. Part of #59. What is on main (#94, the first
plan's PRs 1 and 2): the eras 1995, 2010 and today as content (`content/eras/`), an `era` on the four home places,
`timeStops`, a "Travel in time" chip in the caption of the home's overview, and the lazy panel
(`ui/TimeMachine.svelte`). Everything in *PRs, in order* is new work. It builds on the access technologies of #3
(#82, #83) and the data centre of #35 (#78).

What changed from the first plan, in short:
- **Time travel is a headline feature**, reachable from every screen (the top bar), not a chip on one overview.
- **An era is a whole trip**: the device, the way online, the internet, the data centre, the server *and what you do*.
  1995 is a beige desktop PC on dial-up opening a web page from a server room across the Atlantic; 2010 is a laptop on
  Wi‑Fi and DSL watching a small YouTube-era video from a CDN and a three-tier data centre; today is a phone on fibre
  (or 5G) streaming from a cache nearby, through a leaf–spine fabric.
- This drops two decisions of the first plan: "an era switch is only a place switch within a family" and "the
  internet inside stays today's". The first plan's PR 5 (the 1995 PC and props) and optional PR 7 (the internet in
  time) move to the front. Activities get era variants too (user feedback, the same day).
- **A light "era flavour" layer**: a few small, charming props per era (a wall calendar and a blinking modem in 1995,
  a router with antennas in 2010, a smart speaker today), lazy and per era. It takes in the first plan's "props" PR.
- Later, optional: **1985, before the internet** (a home computer dials one BBS), and a **communication line** across
  the eras (BBS → IRC → instant messaging → an end-to-end encrypted messenger).

## Goal and audience

Turn a dial, pick a year, and take *the same kind of trip* with the technology of that year. The point is what
**changed** (devices, ways online, speed, who is in the middle, what you could even do) and what **stayed the same**
for 30 years (packets, addresses, envelopes inside envelopes, routers reading the address).

- **Kids** see the whole world change: a beige computer with a deep screen and a telephone that is busy while you're
  online; a laptop on the sofa with a blinking box by the phone socket; today's phone. They open the internet and find
  a small room with a few computers on shelves in 1995, a big hall in 2010, a huge one nearby today. One line tells
  them how long things took: "In 1995 this page with one picture took about 15 seconds to arrive."
- **Nerds** get the numbers and the protocols: V.34 and PPP, a leased E1 line to a carrier, a transatlantic cable with
  a few gigabits for *everyone*; ADSL2+/VDSL2, CDNs, three-tier networks with spanning tree; GPON, leaf–spine and ECMP;
  plain HTTP in 1995 and 2010, TLS everywhere today.

## What the user sees

1. **A time button in the top bar, on every screen** (overview, inside the internet, in any dive). It shows a clock
   and the era you are in: "Today", "2010", "1995" ("I dag" in Danish). It is the "where in time am I" sign and the
   way in, so the old open question "should the era show all the time?" is answered: yes, there.
2. **On the overview** the caption keeps its "Travel in time" chip, now on **every place's** overview (the street and
   the desk too), so the first screen a new reader sees has a clear, named entry.
3. **The first-run coach marks** get a last card pointing at the top-bar button: "Hop in the time machine: see this
   trip in 1995 or 2010." Readers who already had the coach marks see only this new card, once.
4. **The panel** is the one on main (the user liked it): a dialog with a native radio dial, each era with its picture,
   year and way online, its text on choosing, and a "Travel to 1995" button. Two changes:
   - Every era is offered from everywhere. The picture of an era is now **its start device** (the PC, the laptop,
     the phone), the most telling thing about it.
   - When your place has no trip in that era, the stop says where you'll land instead: "In 1995 you'd have done
     this at home. You'll travel there." (Phones on the street were only for calls then.)
5. **Travelling morphs the whole trip**: the house's devices swap (the phone shrinks away, the PC pops in), the
   backdrop slides, and if you are inside the internet or the data centre, that scene morphs too: the 1995 server
   room's three shelves replace today's halls. The URL becomes that era's (`#/en/home-dialup/watch-video/internet`),
   so Back undoes the trip in time.
6. **What you do changes with the era** (the activity's wording, packets and layers): open a web page with a picture
   in 1995, watch a small video in 2010, stream one today. The caption says how long it takes, like with like.
7. **Small era touches** around the house: a calendar on the wall, a modem whose lights blink as the page arrives, a
   buffering wheel in 2010, a smart speaker today (*Era flavour*, below).
8. **The picker** ("Where are you?") marks the ways online with their year ("Dial-up · 1995") and says when a place
   would take you back to today.

```mermaid
graph LR
  Top["⏲ top-bar button (eager, every screen)"] -- "import()" --> Panel["TimeMachine.svelte (lazy)"]
  Chip["caption chip (every overview)"] --> Panel
  Panel -- "eraTrip(here, era)" --> Go["go({ places, path })"]
  Go --> Resolve["resolveRoute: the era picks the place, segment and activity variants"]
  Resolve --> Morph["place morph, in every mounted path scene"]
```

## How it fits the engine

### One rule: the era picks a member of every family

On main a **place** has variants (`variantOf: 'home'`) and an `era`. The revision gives **segments** and **activities**
the same two fields, and lets the route's era pick among them:

- **The route's era** is the era of the first place slot that has one, else the newest era (`today`). Places without
  an era (the street, the desk) are today's. The place is still the only thing the reader chooses, so there is still
  **one source of truth and no `?era=`**: `#/en/home-dialup/…` says 1995, and everything else follows.
- **Segments**: `content/segments/isp-to-cdn-1995/segment.ts` says `variantOf: 'isp-to-cdn', era: '1995'`. When the
  activity's route says `{ segment: 'isp-to-cdn' }`, the resolver takes the family member of the route's era, else the
  base. The base has no era: it serves every era without its own variant (2010 can reuse today's internet with its own
  words and still be honest, see *Era-accurate content*).
- **Activities**: `content/activities/watch-video-1995/activity.ts` says `variantOf: 'watch-video', era: '1995'`, with
  its own `route`, `groups`, `flows` (packet kinds, pace, sizes, upper stack) and strings. The URL and the picker name
  the **base** (`watch-video`, the family: "get something big from far away"); the era picks the variant. The id
  `watch-video` is internal; what readers see is the variant's title ("Open a web page"). A variant's strings fall
  back to its base's, so it only says what differs.
- **Groups**: an activity's group spec may name the node that draws it: `{ id: 'datacentre', in: 'internet', node:
  'server-room' }`. The instance id (`datacentre`, and so the URL step) stays the same in every era; its art, backdrop,
  name and text come from `server-room`. This is the hop's `{ at, node }` override (`home-dsl` already draws `router`
  as a `dsl-router`), for groups.
- **Nodes** need no new mechanism: an era's segment or place uses `{ at: 'spine', node: 'aggregation' }`. The rule for
  authors (in `authoring.md`): **an instance id names a job in the story, the node names what does it in that era.**
  Keeping ids for the same job (`bng` is "where the ISP lets you in": a modem bank in 1995, a BNG today; `cdn` is "the
  server that sends it to you") keeps URLs and dives alive across a trip in time. Ids for jobs that only exist in one
  era are that era's own.
- **The engine names no era and no content id.** It knows that places, segments and activities may have `variantOf`
  and `era`, that eras have a year, and that the newest is "now".

Validation (with negative fixtures): a variant's base exists and is not itself a variant; members of a family have
distinct eras; a segment's or activity's base has no era; an activity variant has the same place slots as its base;
every era has at least one place (else the dial couldn't go there); an override group node is `kind: 'network'`. The
existing walks over every place × activity (routes, the scene tree, "all the way down", `describe` at both levels in
every language, overlap at small-screen sizes) then cover every era's trip for free, because each place resolves to its
era's segments and activity. An optional `since: <year>` on technologies, layers and nodes, checked against the route's
era, catches anachronisms cheaply (Wi‑Fi in 1995, TLS on a 1985 BBS).

### What the time machine does from where you are

`timeStops` becomes `eraTrip(choice, path, era)`, pure and tested, used by the panel, the chip and the list view:

1. **The place.** Your place's family member of that era (`home` → `home-dialup`); else **the era's own trip**: the
   first place of that era by `order` (from the street in 1995 → `home-dialup`), and the panel and the arrival
   announcement say so ("In 1995 you'd have done this at home"). From an older era back to today you land on the
   family's today member (`home-dialup` → `home`); Back returns to the street if that's where you came from.
2. **The activity** stays the same family; its era variant comes with the route. (From 1985 on, an era whose variant
   of your activity doesn't exist sends you to that era's first activity, and says so.)
3. **The path** is kept as deep as it can be:
   - A step naming **the old start device** (the first hop of the place: `phone`, `phone~tcp`) is rewritten to the new
     place's start device (`pc`, `pc~tcp`). This "counterpart" rule is generic and helps every place switch (the
     street's phone ↔ the desk's laptop).
   - Other steps keep their instance ids, so `internet/datacentre` stays `internet/datacentre` (the server room in
     1995), and `internet/datacentre/spine` (the leaf–spine dive today) lands on the 2010 three-tier dive, because the
     2010 `spine` hop is an `aggregation` switch with its own dive.
   - Then the **longest valid prefix**, as for any place switch: `internet/datacentre/spine` in 1995 (no spine)
     becomes `internet/datacentre`. A layer dive survives when its hop and layer exist in both trips (`pc~ip` yes,
     `router~ip` in 1995 no: there is no router).
4. **The morph** runs in every mounted path scene, as today. One engine change: a hop whose **node changed** under the
   same instance id (`spine`: a leaf–spine spine → an aggregation switch) cross-fades in place instead of swapping its
   art in one frame.

**Place switching and eras.** The picker keeps the era where it can: in 1995, picking another place takes that
place's 1995 member; a place with none (the street) takes you back to today, and the picker says so under it
("Only today"), and so does the arrival. The access chips stay: they list the whole family, each with its year
("Fibre · today", "Fibre to the building · today", "DSL · 2010", "Dial-up · 1995"), so `home-dsl`, `home-fttb` and
`home-dialup` work as before, and picking "Dial-up" is a trip to 1995 (the top bar says so).

**URLs** (no new parameter; the place carries the era):

| URL | Is |
|---|---|
| `#/en/home-dialup/watch-video` | 1995: the PC, dial-up, "open a web page" |
| `#/en/home-dialup/watch-video/internet/datacentre` | the 1995 server room (same steps as today's data centre) |
| `#/en/home-dsl/watch-video/internet/datacentre/spine` | 2010: inside the aggregation switch (three-tier) |
| `#/en/home/watch-video/phone~tcp` → 1995 | `#/en/home-dialup/watch-video/pc~tcp` (the counterpart rule) |
| `#/en/street/watch-video` → 1995 | `#/en/home-dialup/watch-video` (no street trip then; said so) |
| later: `#/en/home-1985/watch-video` | 1985: the home computer calls a BBS ("download a picture") |

### Content model changes

1. `variantOf` and `era` on **segments** and **activities** (the schema, the registry's family helpers generalised
   from `placeFamily`, the resolver, validation).
2. `node` on an activity's **group spec**.
3. **Strings**: a variant activity's keys fall back to its base's (`activity.watch-video-1995.title` →
   `activity.watch-video.title`); the caption, peek and picker ask through one helper instead of building
   `activity.<id>.…` themselves (four call sites). Variant segments are their own string source, as places are.
4. **`rate` on technologies** (`{ down, up }` in bit/s), overridable per link (`{ link: 'dialup', rate: … }`, since the
   1995 modem is a 28.8k), and **`size` on a packet kind** (bytes of the whole thing the reader waits for: the page,
   the clip, the video). The caption's "how long it takes" line uses the bottleneck of the route and the era's own
   `size`, so it compares like with like.
5. **Era strings** (`era.<id>.name/kid/nerd/describe`) stay as they are; `describe` is rewritten for the new pictures
   (the start devices). New `ui.json` strings: `time.now` (the top bar's "Today"), `time.instead` ("In {era} you'd
   have done this at {place}. You'll travel there."), `time.only` (the picker's "Only today"), `coach.time`.

## Era-accurate content

Simplified on purpose, but every simplification is one a nerd would accept. Instance ids in the tables are jobs that
carry over between eras (bold) or the era's own.

### 1995: a desktop PC on dial-up, a page from across the Atlantic

| Part | What | Notes |
|---|---|---|
| Device | **`pc`** (new node): a beige tower and a deep CRT, an internal modem | Start device; the panel's picture. |
| Access | `dialup` (exists), `rate` 28.8 kbit/s both ways | V.34 (1994); 33.6k came in 1996 and 56k (V.90) in 1998. The era text on main already says so. |
| Exchange | `exchange` (exists): the phone company connects the call | `modem-call` and `ppp-hello` dives exist. |
| ISP | **`bng`** as a `modem-bank` (new node: a rack of modems and a terminal server), then **`core`** as a small ISP's one router | PPP gives the PC a public address; no NAT. |
| Out of the ISP | a leased line (`leased-line`, new technology: E1, 2 Mbit/s, PPP/HDLC framing, dive `copper-pulses` in an E1 mode) to an upstream carrier (`transit`, as the main path) | A small ISP bought its whole internet as one line from a bigger network. |
| Across the sea | `submarine` (exists) across the Atlantic, ~6,000 km | CANTAT-3 (1994) landed at Blåbjerg in Denmark: 3 × 2.5 Gbit/s for every phone call and every byte between Scandinavia and North America. Today's cables carry hundreds of Tbit/s each. |
| The far end | the server room (**`datacentre`** drawn as `server-room`, new network node with a backdrop: a few tower servers on shelves), a router, a 10 Mbit/s hub, **`cdn`** as a `web-server` (a beige tower) | No CDN (Akamai began in 1998–99), no load balancer, no origin aside: this one server *is* the original. Its dive is a new, small `tower-inside` (one program, one disk), lazy. |
| Activity | `watch-video-1995`: "Open a web page with a picture", flow `ip › tcp › http` (no TLS), a 40 kB page + picture | SSL 2.0 shipped in Netscape in 1995 for shops, but pages and pictures were plain HTTP. Video was barely possible: stamp-sized clips (160 × 120, a few frames a second) that you mostly downloaded first; the nerd text says so in one sentence. |
| How long | about 15 s for the page at 28.8k ("a whole video like today's: about 4 hours") | |

### 2010: a laptop on Wi‑Fi, DSL, a small video from a CDN

| Part | What | Notes |
|---|---|---|
| Device | **`laptop`** (exists) on Wi‑Fi | Replaces the phone in `home-dsl`; its text is overridden there (`place.home-dsl.stop.laptop.*`: on Wi‑Fi, not a cable). |
| Access | `home-dsl` as on main: Wi‑Fi (802.11n, 2009) → `dsl-router` → `vdsl` to a DSLAM in the street cabinet | Most Danish DSL in 2010 was still ADSL2+ from the exchange; VDSL2 from cabinets was new (TDC from about 2008; ~21 % of broadband by 2012). See *Decisions to confirm*. |
| ISP and internet | today's `isp-to-cdn` (no variant): core, border router, an exchange, a CDN | CDNs and exchanges were everywhere by 2010. The 2010 activity's nerd text says the cache was usually in a bigger city further away. |
| Data centre | `datacentre` 2010 variant through the activity variant: **`dc-router`** (core), **`load-balancer`**, **`spine`** as an `aggregation` switch (new node, dive `three-tier`: core → aggregation → access, one uplink blocked by spanning tree, oversubscription), **`rack-switch`** (access), **`cdn`** cache server | Three-tier was the norm through the 2000s; leaf–spine (Clos, ECMP) spread with the hyperscalers from about 2010 and became the default by the mid-2010s. |
| Activity | `watch-video-2010`: "Watch a small video", 360p (YouTube's usual setting then; 720p HD from 2008), flow `ip › tcp › http` | YouTube moved to HTTPS by default in the mid-2010s. |
| How long | "arrives about 10× faster than you watch it" (a 3-minute 360p video, ~15 MB, at ~8 Mbit/s) | Streaming is "faster than you watch", not "how long". |

### Today: a phone, fibre (or 5G), a cache nearby

As on main: the phone on Wi‑Fi, FTTH (`home`), FTTB, or the street's 5G; the ISP, an exchange, the CDN's data centre
next door with leaf–spine and the cache server; `ip › tcp › tls › http`; HD video ("arrives about 100× faster than you
watch it"). The base activity `watch-video` is today's.

### Sources (checked 2026-10-02)

- Modems: Wikipedia, *Modem* and *V.34*; *Dial-up Internet access*.
- Web video in 1995: Tech Monitor, "VDOnet launches VDOLive … using a 28kbps modem" (1995); Wikipedia, *RealNetworks*.
- CDNs: Wikipedia, *Akamai Technologies* (founded 1998, service 1999).
- Transatlantic: Wikipedia, *CANTAT-3*; atlantic-cable.com, *Danish PTT*; Wikipedia, *MAREA* (today's capacity).
- Danish DSL: Wikipedia, *Internet in Denmark*; Ericsson/TDC VDSL2 announcement (2007–08).
- Data centres: Al-Fares et al., "A scalable, commodity data center network architecture" (SIGCOMM 2008); Facebook
  Engineering, "Introducing data center fabric" (2014); Wikipedia, *Clos network*.
- Wi‑Fi: Wikipedia, *IEEE 802.11n-2009*. YouTube: Wikipedia, *YouTube* (HD 2008); Google Transparency Report, *HTTPS
  encryption* (YouTube).
- BBSes and FidoNet: Wikipedia, *Bulletin board system* and *FidoNet* (1984, nightly mail hour); textfiles.com, *BBS
  documentary*. IRC: Wikipedia, *IRC* (Jarkko Oikarinen, Finland, 1988). Messengers: Wikipedia, *MSN Messenger*,
  *Skype*, *Signal Protocol*.

## Era flavour (decided)

Not a restyle: a few small, cute details per era that make each trip feel like its time, on top of the theme. They
are decoration, so they never carry meaning the text doesn't; the place's `describe` mentions the one or two a reader
would notice ("a calendar on the wall says 1995").

| Era | Picks |
|---|---|
| 1985 (with its PR) | Green phosphor text on the home computer's and the BBS's screens; a blocky, pixel-art welcome banner on the BBS (drawn with rectangles, no font); a floppy disk on the desk; **the parcel as a little floppy**. |
| 1995 | A soft CRT glow round the PC's screen; a wall calendar ("1995"); a mouse on a mouse pad; an external modem whose lights blink while packets are on the dial-up line; an hourglass by the screen while the page loads; **the parcel with a little stamp**. |
| 2010 | Two antennas on the DSL router; a buffering wheel on the laptop's screen while the video starts; a slider phone on the sofa; a star sticker on the laptop's lid; **the parcel with a glossy highlight**. |
| today | A smart speaker on the shelf (a plain cylinder with a light ring); a skeleton loader (grey bars) on the phone's screen while the video starts; the parcel as it is. |

The 1995 server room and the 2010 data centre carry their era in their own backdrops (beige towers, a hall of grey
racks); no props there.

How it fits:
- **Lazy, per era.** `content/eras/<id>/art/Props.svelte` and, optionally, `content/eras/<id>/art/Packet.svelte`,
  found by a non-eager glob in `model/components.ts` and loaded when a route of that era is first shown (and
  prefetched when that era is chosen in the panel). Until loaded, nothing is drawn: decoration needs no placeholder.
  Eager cost: the glob and the mount point, about 0.15 kB.
- **Where they go.** A place's overview layout gets named prop spots per orientation (`props: { wall: [x, y, size],
  desk: […], shelf: […], screen: […] }`); `Props.svelte` gets `{ orient, w, h, time, still, spots, busy }` and draws
  into the spots it knows, skipping those a place lacks. `busy` (packets on the access link) drives the modem's lights,
  the hourglass, the buffering wheel and the skeleton loader. Props sit over the backdrop and under the devices, and
  fade and slide with the place backdrop in the morph.
- **The parcel touch**: the theme's `Packet` slot draws the era's `Packet.svelte` (if any) as a small mark inside
  its own shape, so up and down still differ by shape (#53), not by the era's touch.
- **The top-bar button keeps its clock in every era**, so it stays recognisable; the era is its word.
- **Tokens only**: no colour literals, no SVG filters (`art-colours.test.ts`). The CRT glow is layered shapes with
  opacity; phosphor green needs two new theme tokens (`--phosphor`, `--phosphor-ink`), day and night, in
  `contrast.test.ts`. Text on props (the calendar's year) goes through `Text` with its halo.
- **Motion**: the blinking, the hourglass and the wheel follow `view.time`, so pause stops them, and under reduced
  motion they are still (lit, turned, shown).
- **No brands**: no logos and no product shapes that read as one (a generic slider phone, a plain speaker).
- **Accessibility**: props are `aria-hidden` and not focusable; they never cover a device, a label or a door (the
  overlap test gets the prop spots).

## Later: 1985, before the internet (optional)

A 1985 stop shows the world **before** home internet: a home computer and its modem (300 or 1200 bit/s) phone **one
BBS**, a computer with one phone line in someone's house. There is no network in between: just the call through the
exchange. You read the message board or download a small picture, a character at a time. Nerd note: at night, during
the "mail hour", BBSes called each other to pass mail on (FidoNet, 1984), drawn as a dashed side branch from the BBS to
another BBS (an `aside`, which exists).

What it needs from the engine (it is the first trip that is not "client → internet → server"):
- **A route that is only a place**: the variant activity's route is `[{ place: 'me' }]`, the place `home-1985` ends at
  the BBS (an endpoint), and it lists no groups (no internet to open). The caption and the ladder must cope with a
  route without groups; the content tests already walk it.
- **A flow without IP**: `watch-video-1985` ("Download a picture from a BBS") with a stack of one new layer,
  `xmodem` (128-byte blocks, a checksum, ACK or NAK and send again), and its dive `xmodem-blocks`. The packet model
  and `LayerCtx` must allow a flow with no IP layer (no addresses, no ports); a test fixture first.
- **Per-era activities** (above) and the time machine's activity rule (step 2 of *What the time machine does*).
- Its era flavour (green phosphor, the pixel banner, the floppy parcel), as in *Era flavour*.
- Nodes `home-computer` (generic, no brand) and `bbs`; era `1985`; `rate` 1200 bit/s, so the line says "about 4
  minutes for this little picture".

## Later: the communication line (optional; decided: after the content line)

A second activity family with era variants, the "send a message" idea of #10, so the dial tells a second story: who is
in the middle, and who can read your message.

| Era | What | Who can read it |
|---|---|---|
| 1985 | a BBS message board or a one-line chat: everyone dials into the same computer | the BBS's owner (sysop) |
| 1995 | IRC: your server relays to the next and the next, to your friend's | every server on the way |
| 2010 | instant messaging (MSN- or Skype-style): one company's central server reads and forwards | the company |
| today | an end-to-end encrypted messenger: the server forwards but can't read | only you and your friend |

What the engine needs: **two place slots** (`me` and `friend`, designed in but unused) with the friend's access path
walked backwards; **relay paths** (the server ends one connection and starts the next: two legs, each with its own
`LayerCtx`); a message layer per era with `openAt` saying who can read it (`e2ee` sealed even at the server, `im`
open there); **store-and-forward** timing for the BBS (the message waits until your friend calls); the picker's second
slot; and the time machine moving **both** slots to the era. It gets its own update of this plan (or #10's) before
code.

## Accessibility

The rules of #53 (`docs/accessibility.md`), applied to the new parts:
- **The top-bar button** is a `button` with `aria-haspopup="dialog"` and `aria-expanded`. Its name contains its
  visible text (WCAG 2.5.3): "Travel in time: 1995". It sits after Explore and before pause, so it never moves when
  Explore comes and goes. 44 px target (#79), the engine's focus ring, the theme's ink for its icon (forced colours
  too). Esc in the panel gives focus back to whichever control opened it (top bar, caption chip, list view).
- **The panel** stays as built: `role="dialog"`, `aria-modal`, everything behind `inert`, a native radio group,
  choosing separate from going. The "you'll land at home instead" line is part of the radio's description
  (`aria-describedby`), so it is heard before going.
- **After travelling**, focus goes to the caption's heading and the announcer says the arrival: the era, the place's
  `describe`, and, if you were moved, why ("In 1995 you'd have done this at home"). If the path fell back to a
  shallower scene, the announcer says the scene you are in (as for any fallback).
- **The coach mark** is the existing pattern (a card pointing at a control, Next, Skip, Esc).
- **The list view** keeps its "Travel in time" button, now on every place.
- **Night, contrast, art**: new art (the PC, the server room, the tower server, the modem bank, the aggregation
  switch, the BBS later) uses tokens only (`art-colours.test.ts`), no filters, labels with halos; the top-bar
  button's text pairs join `contrast.test.ts`; `npm run evaluate -- --only=a11y --mode=night` per PR.
- **Reduced motion**: the morph is the existing short cross-fade (`view.still`); the node cross-fade in place adds
  no motion.
- **Colour is never the only cue**: the era is a word in the top bar, the current era a ring and "You are here".

## Viewports and modes

- **Desktop**: the top-bar button with its icon and era name; the panel as on main.
- **Portrait phone (390 × 844)**: the controls wrap under the ladder; the button shows icon + era name ("1995" is
  short; "Today"/"I dag" too). PR 1 measures the row at 360 and 390 px in both languages; if it doesn't fit, Explore
  goes icon-only below 400 px before anything else (pause must stay one tap away).
- **Short landscape (844 × 390)**: the slim row; icon + year.
- **Day and night**: tokens only.

## Lazy loading and the eager-JS budget

Main is about **94 kB gz eager** (measured as `architecture.md`'s "Initial JS" paragraph does). Each PR reports its
eager delta against main and updates that paragraph. The **first wave (PRs 1–8) should add at most about 3 kB gz
eager in all**.

| PR | Eager (estimate) | Lazy |
|---|---|---|
| 1. Prominence, a device per era | ~0.6 kB (button + wiring ~0.25, global stops + counterpart rule ~0.15, `pc` art ~0.3, or ~0.05 after #91) | coach card (coach chunk), panel changes |
| 2. Era flavour | ~0.15 kB (lazy glob, mount point, prop spots in the layouts) | each era's `Props.svelte` and `Packet.svelte` (~1–2 kB each) |
| 3. Era variants (engine) + honest flows | ~0.5 kB (schema, resolver, strings fallback, cross-fade; two activity variants' data and English strings) | |
| 4. How long it takes | ~0.3 kB (rates, sizes, bottleneck, `Intl.NumberFormat` units) | |
| 5. 1995: the internet | ~0.8 kB (segment + layouts ~0.3, English strings ~0.3, `modem-bank` art ~0.2, or ~0 after #91) | `copper-pulses` E1 mode (its chunk) |
| 6. 1995: the server room | ~0.7 kB (strings ~0.3, `server-room` art + backdrop and `web-server` art ~0.4, or ~0.05 after #91) | `tower-inside` dive |
| 7. 2010: the data centre | ~0.5 kB (activity variant layouts, strings, `aggregation` art ~0.2 or ~0 after #91) | `three-tier` dive |
| 8. The picker and eras | ~0.1 kB | |
| 9. 1985 (later) | ~0.6 kB (no-IP flows, route without groups, content) | `xmodem-blocks` dive |

- **#91 (lazy device art and backdrops)** is the big lever: about half of PRs 5–7's eager cost is new device art and
  the server room's backdrop. Best order: #91 before PR 5. Era props are lazy whether or not #91 has landed.
  Whichever lands first, the time machine must not show placeholders mid-trip: once #91 is in, choosing an era in the panel **prefetches the target trip's art** (the
  devices of its route and its backdrop), and the panel awaits its era pictures' art as it loads (it is lazy anyway).
- **Era strings stay lazy** (`era.*` in the dive-strings chunk, as on main). The English strings of era variants
  (places, segments and activities with an older era) are eager like all place strings. If the first wave passes
  +3 kB, the `string-packs` plugin keeps them in a lazy pack that is awaited before an older era's route is shown
  (as `loadDiveStrings`), worth ~1 kB.
- **New dives are lazy by design** (`render/dives.svelte.ts`). Device art stays lean: vocabulary classes, no
  gradients, no `{...attrs}` spreads.

## Performance

The trip in time is the place morph (about 750 ms), now possibly inside the internet and the data centre too, with more
nodes popping than any morph so far. `npm run evaluate` gets phases for the morph today → 1995 at the overview and at
`internet/datacentre`, and 2010 → today at `internet/datacentre`, with their idles. Budget as everywhere: p95 ≤ 16.8
ms at 6× CPU. Runs take the evaluate lock.

## Tests

- `eraTrip` on the real content and fixtures: the family member, else the era's first place (said), the counterpart
  rule, the longest valid prefix, Back. Every scene path of every era maps to a valid path (or its prefix) in every
  other era.
- Variant resolution: each place resolves to its era's segments and activity; a base serves eras without a variant.
- Validation fixtures for every rule in *One rule* (and `since`, if added).
- Strings: variant fallback; `describe` for every new scene and variant at both levels, en and da (the existing walk).
- The how-long line: the bottleneck along each era's route; formats in en and da.
- The a11y run's keyboard journey from the top bar inside a dive: open, arrow to 1995, Enter; focus on the caption's
  heading; the announcer names the era and, from the street, why you moved.

## PRs, in order

Each is small, leaves main working and says "Part of #59".

1. **Prominent, and a device per era.** The top-bar time button on every screen; the caption chip on every overview;
   `eraTrip` with "the era's own trip" for places without one (and the panel's and the announcer's line saying so);
   the counterpart rule for the start device; a coach card (and the one-time card for readers who had the coach
   marks); the `pc` node in `home-dialup` and the `laptop` on Wi‑Fi in `home-dsl` (own layouts); the panel's pictures
   become the start devices and the eras' `describe` is rewritten for them (en + da, kid + nerd). The internet stays
   today's in every era for one more PR. Screenshots day and night on phone, desktop and short landscape.
2. **Era flavour.** The lazy per-era props and parcel touches for 1995, 2010 and today (the picks above), prop spots
   in the home places' layouts, the 1995 overview's `describe` updated (en + da, kid + nerd). Takes in the first
   plan's PR 5 ("props"). Screenshots day and night.
3. **Era variants as content.** `variantOf`/`era` on segments and activities, the route's era, group `node`,
   variant string fallback, the cross-fade for a changed node, validation and tests. First callers: the 1995 and 2010
   activity variants with honest flows (no TLS) and wording ("Open a web page with a picture", "Watch a small video").
4. **How long it takes.** `rate` (with the 28.8k override), `size` on each era's packet kinds, the caption line (kid
   and nerd), like with like.
5. **1995: the internet.** `isp-to-cdn-1995`: the modem bank, the small ISP's router, a leased line to a carrier,
   the transatlantic cable; `leased-line` and the E1 mode of `copper-pulses`; owners' words; describes.
6. **1995: the server room.** The `server-room` group node and backdrop, the hub, the tower `web-server` and its
   `tower-inside` dive; no CDN, no origin.
7. **2010: the data centre.** The three-tier variant (`aggregation` with its `three-tier` dive), the cache further
   away in words, the 2010 nerd texts.
8. **The picker and eras.** Year tags on the access chips, "Only today" under places without a trip in this era,
   the arrival line when the picker takes you back to today.
9. **1985: before the internet** (optional; update this plan first): `home-1985`, the BBS, the `xmodem` layer and dive,
   a route without the internet, flows without IP, the FidoNet aside, its era flavour (with the phosphor tokens).
10. **The communication line** (optional, later; its own plan update): `send-message` and its era variants, two place
    slots, relays, `e2ee`.

Also optional, any time after PR 3: a 2002 stop (ADSL from the exchange, the `dsl-tones` ADSL mode drafted in the
first plan), and mobile eras on the street (a 2010 phone on 3G).

## Risks

- **Three whole trips is a lot of content**: layouts for both orientations, describes in two languages and two levels
  for every new scene. The walks catch omissions; the Danish drafts need a native review.
- **Instance-id discipline.** If an era renames a job's id, its URLs and dives stop surviving a trip. The "every path
  maps" test makes that visible.
- **The top bar on small phones** may not fit one more control (see *Viewports*).
- **Era flavour creep**: props are fun to add. Keep to the picks above (four or five an era) and to the prop spots, so
  they never crowd the scene or cost frames; the evaluate phases include the 1995 overview with its blinking modem.
- **Eager growth**: device art and English strings; mitigations above (#91, a lazy era pack).
- **Anachronisms**: the optional `since` check; each content PR lists its sources.
- **Morph cost**: inside the data centre whole regions swap; the new evaluate phases watch p95.
- **Two "switch" UIs** (the picker's access row, the dial) reach the same places. The year tags make the overlap a
  feature: the access row is "what kind of home", the dial is "when".

## Decisions

Decided (the user may overrule any of them):
- **No `?era=`**: the place carries the era; segments and activities follow.
- **One dial for everything**: eras are global content.
- **Whole trips per era**, each with its own device, access, internet, data centre and activity (2026-10-02).
- **Activities change per era** as variants of one family, named by the base in the URL (2026-10-02).
- **Content line first; the communication line later** (user, 2026-10-02).
- **No era palette** (sepia): devices and the era flavour carry the era.
- **An era flavour layer**: a few small, lazy, token-only props per era, no brands (user, 2026-10-02).

Kept from building #94: one helper for the stops (now `eraTrip`); the clock icon from `ui/icons.ts`, not the emoji;
choosing separate from going; the panel is the picker's dialog; panel strings in `ui.json`, era strings lazy; radios
checked from code; the morph's reduced-motion cross-fade. Revised: the picture of an era is its **start device**, not
the home's connecting box; the first plan's "props" PR became the era flavour; the way in is the **top bar** plus the overview chip, not the chip alone.

## Decisions to confirm

1. **The way in**: a time button in the top bar on every screen showing the era, plus the chip on every overview,
   plus a coach card. *Recommended.* (Alternative: the top bar only.)
2. **Places with no trip in an era** (the street in 1995): travel to that era's home trip and say so. *Recommended.*
   (Alternative: grey the era out from there.)
3. **1995's activity**: "open a web page with a picture" (15 s), with stamp-sized clips as a nerd note.
   *Recommended*, rather than a tiny clip as the main activity.
4. **2010's DSL**: keep `home-dsl`'s VDSL2 from the street cabinet (new then, already built) and say in the nerd
   text that most homes still had ADSL2+. *Recommended*, rather than rebuilding it as ADSL2+ from the exchange.
5. **1985 BBS**: plan it as the optional PR 9, after the three trips, not before. *Recommended.*
