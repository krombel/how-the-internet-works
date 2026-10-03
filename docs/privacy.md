# Privacy

How the Internet Works is a static web page. It has no accounts, no tracking, no cookies and no analytics, and it
sends nothing about you anywhere.

## What the app itself does

- **No tracking and no analytics.** There are no counters, pixels, beacons or third-party scripts. The app never sends
  data from your browser to any server.
- **No cookies.** The app sets none.
- **No third-party requests.** The fonts (Baloo 2 and JetBrains Mono, from Fontsource) and every other asset are
  bundled and served from the same site as the page. Nothing is fetched from a CDN, font service or other site.
- **Where you are in the app is in the address.** The language, place, activity and scene are in the URL (e.g.
  `#/da/on-the-go/watch-video/internet`), and a few settings can be in its query (`?level=technical`, `?mode=night`,
  `?style=…`). The part after `#` never leaves your browser. The query is sent to the web server with the
  page request, like any address.

## What it remembers in your browser

A few settings are kept in your browser's `localStorage`, so the app looks the same next time. They stay on your device,
are never sent anywhere, and you can delete them by clearing the site's data in your browser.

| Key | Value | What it is |
| --- | --- | --- |
| `level` | `kid` or `nerd` | The level you picked |
| `style` | a theme id, e.g. `storybook` | The art style |
| `mode` | `day` or `night` | Day or night, only when you picked the one your system doesn't prefer |
| `paused` | `1` | The packets are paused (removed when you play them again) |
| `speech` | `1` | Read aloud is on (removed when you turn it off) |
| `coached` | `1` | The first-visit tips were shown, so they aren't shown again |

Nothing else is stored: sound is always off when the page loads, and the language comes from the address.

## What the browser and the host may do

- **Hosting.** When the app is served from GitHub Pages, GitHub receives each page request like any web server does,
  and may log your IP address and other request details. See the
  [GitHub General Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).
  If you run it yourself (`npm run dev`, or the `dist/` build on your own server), only your own server sees requests.
- **Read aloud** uses your browser's own speech (`speechSynthesis`). The app prefers voices that run on your device,
  but on some browsers and systems the only voice for a language is an online one, and then the browser's maker
  turns the text into speech on its servers.
- **Learn-more links** open other sites (mostly Wikipedia) in a new tab only when you click one. That site then gets
  your request like any visit, and your browser usually tells it which site the link was on (just the address of
  this site, not the page you were on).
