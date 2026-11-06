# promo-popup

One hosted script that shows a seasonal offer card on any WM4D site. It appears one second after
the page loads: bottom-left on desktop, centred over the page on phones. Each site sets its own
offer with attributes on the tag. Fixes ship from here to every site at once.

The layout copies the "Holiday Specials" popup on dentalimplantsinmichigan.com, which is an Elementor
popup. This version has no WordPress dependency, so it works on our Astro, Next and static sites.

Deployed as a Cloudflare Worker serving static files only (`public/`), the same setup as `ghl-chat`.

## Add it to a site

```html
<script defer src="https://promo-popup.whitney-fad.workers.dev/v1.js"
  data-eyebrow="*Holiday* Specials"
  data-headline="$4,000 Off All-On-4 w/ Zirconia or $2,000 Off Single Tooth Implants"
  data-subtext="Now through November 30th"
  data-expires="2026-11-30"></script>
```

Put it last in `<body>`. In Astro, mark it `is:inline` so Astro leaves it alone. To pull the offer
from a site's config, use `define:vars` or plain attribute expressions:

```astro
<script is:inline defer src="https://promo-popup.whitney-fad.workers.dev/v1.js"
  data-eyebrow={promo.eyebrow}
  data-headline={promo.headline}
  data-subtext={promo.subtext}
  data-expires={promo.expires}></script>
```

**Always set `data-expires`.** Without it, "Now through November 30th" keeps showing in December.

| Attribute | Default | Meaning |
|---|---|---|
| `data-headline` | required | The offer. |
| `data-eyebrow` | none | Line above the offer. `*word*` is shown in italics. |
| `data-subtext` | none | Line under the offer, usually the end date. |
| `data-link` | none | Adds a button. A URL, `tel:…`, `#anchor`, `chat` (opens the GHL chat when `ghl-chat/v1.js` is on the page), or `call`. **Use `call` on sites with WhatConverts or CallRail:** it dials the page's own first `tel:` link after the tracking number is swapped in. A hard-coded `tel:` in the popup is never swapped, so those calls lose their ad attribution. With no `tel:` link on the page, no button shows. |
| `data-cta` | `Claim This Offer` | Button text. Only used with `data-link`. |
| `data-icon` | `award` | `award` (ribbon badge), `none`, or an image URL. |
| `data-delay` | `1000` | Milliseconds after page load before it appears. |
| `data-starts` | none | `YYYY-MM-DD`. Hidden before this date, in the visitor's local time. |
| `data-expires` | none | `YYYY-MM-DD`. Hidden after the end of this date. |
| `data-dismiss-days` | `0` | `0`: once closed, it stays closed for the browser session. `N`: stays closed for N days. A new headline always shows again. |
| `data-exclude` | none | Comma-separated path prefixes where it never shows, e.g. `/thank-you,/privacy-policy`. |
| `data-mobile` | `center` | Below the breakpoint: `center` (matches the reference), `bottom` (compact card pinned to the bottom), or `off`. |
| `data-breakpoint` | `768` | Viewport width in px where the mobile layout starts. Match the site's own mobile breakpoint. |
| `data-bottom-offset` | `0` | Px to lift the mobile `bottom` card, so it sits above a sticky call bar instead of covering it. |
| `data-bg` | `#0b2a5e` | Card background. |
| `data-accent` | `#1f5bd6` | Badge and button colour. |
| `data-text` | `#ffffff` | Text colour. |
| `data-font` | site's font | Font family. By default the card uses the site's body font. |

### Hooks

- **Events:** `promo-popup:show`, `promo-popup:close` and `promo-popup:click` fire on `document`.
- **GTM:** if `window.dataLayer` exists, the script pushes `promo_popup_show`, `promo_popup_close`
  and `promo_popup_click`, each with `promo_headline`. Build a GA4 event tag on those to see whether
  the popup produces calls and form fills.
- **API:** `window.wm4dPromoPopup.show()`, `.hide()`, `.reset()` (clears the visitor's dismissal).

### How it behaves

- Renders in a shadow DOM, so site CSS (Tailwind resets, theme styles) can't break it, and it
  can't break the site.
- Non-modal: it doesn't trap focus or block the page. The close button and Esc both dismiss it.
  Reduced-motion users get a fade with no slide.
- Text is inserted as text, never as HTML.

## Mobile: decide per site

The `center` layout matches the reference, but it covers the main content on page load.
[Google's intrusive interstitial guidance](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials)
names this pattern as a poor mobile experience, and it can hurt mobile ranking. On PPC landing
pages it also covers the headline and call button that the ad paid to get a visitor to. Consider
`data-mobile="bottom"` for SEO sites, and A/B test `center` against `bottom` on PPC sites by calls
and form fills, not by popup clicks.

## Change it safely

- `v1.js` only receives **backward-compatible** fixes. Renaming an attribute, an event or the API
  is a breaking change: copy to `v2.js` and move sites over one by one.
- Every deploy reaches every site within about five minutes (`Cache-Control: max-age=300` in
  `public/_headers`). Test before deploying:
  1. `pnpm install`, then `pnpm dev`, and open `http://localhost:8787/`.
  2. Check: it appears after one second bottom-left, close and Esc dismiss it, a reload keeps it
     closed, and "Reset dismissal" brings it back.
  3. Repeat at phone width, and try the test links on the page (`?mobile=bottom`, `?expires=2020-01-01`).
- `pnpm run deploy` publishes (not `pnpm deploy`, which is a different pnpm command). Live at
  `https://promo-popup.whitney-fad.workers.dev`. To move to a custom domain, add the route in
  `wrangler.jsonc` and update each site's tag.
