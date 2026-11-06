/*! WM4D promo popup v1 — https://github.com/Web-Marketing-for-Dentists/promo-popup */
/*
  One tag per site:

    <script defer src="https://<host>/v1.js"
      data-eyebrow="*Holiday* Specials"
      data-headline="$4,000 Off All-On-4 w/ Zirconia or $2,000 Off Single Tooth Implants"
      data-subtext="Now through November 30th"
      data-expires="2026-11-30"></script>

  Content
    data-eyebrow      Small line above the offer. Wrap words in *asterisks* to italicise them.
    data-headline     The offer (required).
    data-subtext      Line under the offer, e.g. the end date.
    data-link         Optional. Adds a button: a URL, "tel:…", "#anchor", or "chat" (opens the
                      WM4D GHL chat when ghl-chat/v1.js is on the page).
    data-cta          Button text, default "Claim This Offer". Ignored without data-link.
    data-icon         "award" (default), "none", or an image URL.

  Timing
    data-delay        Milliseconds after page load before it appears, default 1000.
    data-starts       YYYY-MM-DD. Hidden before this date (visitor's local time).
    data-expires      YYYY-MM-DD. Hidden after the end of this date. Set it so a stale offer
                      never shows.
    data-dismiss-days 0 (default) = a closed popup stays closed for the browser session.
                      N = stays closed for N days. Changing the headline shows it again.
    data-exclude      Comma-separated path prefixes where it never shows, e.g. "/thank-you,/privacy".

  Layout
    data-mobile       Below the breakpoint: "center" (default, card over the page), "bottom"
                      (compact card pinned to the bottom), or "off".
    data-breakpoint   Viewport width in px where the mobile layout starts, default 768.
                      At and above it, the card sits bottom-left.

  Look (any CSS colour)
    data-bg           Card background, default #0b2a5e.
    data-accent       Badge and button colour, default #1f5bd6.
    data-text         Text colour, default #ffffff.
    data-font         Font family. Default: inherits the site's body font.

  Hooks
    Events on document: "promo-popup:show", "promo-popup:close", "promo-popup:click".
    If window.dataLayer exists, pushes { event: "promo_popup_show" | "promo_popup_close" |
    "promo_popup_click", promo_headline } for GTM.
    API: window.wm4dPromoPopup.show(), .hide(), .reset() (clears the dismissal).

  Versioning: v1.js only receives backward-compatible fixes. Renaming an attribute, event or the
  API ships as v2.js.
*/
(function () {
  "use strict";

  if (window.wm4dPromoPopup) return; // Included twice: the first copy wins.

  var self = document.currentScript || document.querySelector("script[data-headline]");
  if (!self) return;
  var d = self.dataset;

  function opt(name, fallback) {
    var v = d[name];
    return v == null || String(v).trim() === "" ? fallback : String(v).trim();
  }
  function num(v, fallback) {
    var n = parseInt(v, 10);
    return isNaN(n) || n < 0 ? fallback : n;
  }

  var cfg = {
    eyebrow: opt("eyebrow", ""),
    headline: opt("headline", ""),
    subtext: opt("subtext", ""),
    link: opt("link", ""),
    cta: opt("cta", "Claim This Offer"),
    icon: opt("icon", "award"),
    delay: num(opt("delay", ""), 1000),
    starts: opt("starts", ""),
    expires: opt("expires", ""),
    dismissDays: num(opt("dismissDays", ""), 0),
    exclude: opt("exclude", ""),
    mobile: opt("mobile", "center").toLowerCase(),
    breakpoint: num(opt("breakpoint", ""), 768),
    bg: opt("bg", "#0b2a5e"),
    accent: opt("accent", "#1f5bd6"),
    text: opt("text", "#ffffff"),
    font: opt("font", "")
  };

  if (!cfg.headline) {
    if (window.console) console.warn("[promo-popup] data-headline is required; nothing shown.");
    return;
  }

  /* ---------- Should it show at all? ---------- */

  function parseDay(s, endOfDay) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return endOfDay
      ? new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59, 999)
      : new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
  }

  function inDateWindow() {
    var now = new Date();
    var start = cfg.starts && parseDay(cfg.starts, false);
    var end = cfg.expires && parseDay(cfg.expires, true);
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }

  function excludedPath() {
    if (!cfg.exclude) return false;
    var path = location.pathname;
    return cfg.exclude.split(",").some(function (p) {
      p = p.trim();
      if (!p) return false;
      return p === "/" ? path === "/" : path.indexOf(p) === 0;
    });
  }

  // Key includes a hash of the headline, so a new offer shows even to people who closed the old one.
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  var KEY = "wm4d-promo-popup:" + hash(cfg.headline);

  function isDismissed() {
    try {
      if (sessionStorage.getItem(KEY)) return true;
      var until = parseInt(localStorage.getItem(KEY), 10);
      if (until && Date.now() < until) return true;
      if (until) localStorage.removeItem(KEY);
    } catch (e) {}
    return false;
  }
  function remember() {
    try {
      if (cfg.dismissDays > 0) {
        localStorage.setItem(KEY, String(Date.now() + cfg.dismissDays * 864e5));
      } else {
        sessionStorage.setItem(KEY, "1");
      }
    } catch (e) {}
  }
  function forget() {
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
    } catch (e) {}
  }

  var mq = window.matchMedia("(max-width: " + (cfg.breakpoint - 0.02) + "px)");
  function mobileOff() {
    return mq.matches && cfg.mobile === "off";
  }

  /* ---------- Analytics ---------- */

  function emit(name) {
    try {
      document.dispatchEvent(new CustomEvent("promo-popup:" + name, { detail: { headline: cfg.headline } }));
    } catch (e) {}
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: "promo_popup_" + name, promo_headline: cfg.headline });
    }
  }

  /* ---------- Build ---------- */

  var CSS =
    ":host{all:initial;font-family:inherit}" +
    "*{box-sizing:border-box}" +
    ".card{position:fixed;left:20px;bottom:20px;z-index:2147483000;width:400px;max-width:calc(100vw - 40px);" +
    "padding:48px 32px 30px;background:var(--pp-bg);color:var(--pp-text);border-radius:10px;" +
    "box-shadow:0 20px 50px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.2);text-align:center;font-family:var(--pp-font,inherit);" +
    "line-height:1.3;-webkit-font-smoothing:antialiased;opacity:0;visibility:hidden;transform:translateY(18px);" +
    "transition:opacity .35s ease,transform .35s ease,visibility 0s linear .35s}" +
    ".card.is-open{opacity:1;visibility:visible;transform:none;transition:opacity .35s ease,transform .35s ease}" +
    ".badge{position:absolute;top:-36px;left:50%;width:64px;height:72px;margin-left:-32px;display:block;object-fit:contain}" +
    ".close{position:absolute;top:10px;right:10px;width:36px;height:36px;padding:0;border:0;border-radius:50%;" +
    "background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.85}" +
    ".close:hover{opacity:1;background:rgba(255,255,255,.12)}" +
    ".close:focus-visible,.cta:focus-visible{outline:2px solid var(--pp-text);outline-offset:2px}" +
    ".close svg{width:16px;height:16px}" +
    ".eyebrow{margin:0 0 16px;font-size:20px;font-weight:600}" +
    ".eyebrow em{font-style:italic}" +
    ".headline{margin:0;font-size:24px;font-weight:700;line-height:1.3}" +
    ".subtext{margin:16px 0 0;font-size:18px;font-weight:400;opacity:.92}" +
    ".cta{display:inline-block;margin-top:20px;padding:12px 24px;border-radius:6px;background:var(--pp-accent);" +
    "color:#fff;font:inherit;font-size:16px;font-weight:600;text-decoration:none;border:0;cursor:pointer}" +
    ".cta:hover{filter:brightness(1.1)}" +
    /* Mobile: centred over the page */
    ".card.m-center{left:50%;top:50%;bottom:auto;width:calc(100vw - 64px);max-width:330px;padding:48px 24px 28px;" +
    "transform:translate(-50%,-46%)}" +
    ".card.m-center.is-open{transform:translate(-50%,-50%)}" +
    ".m-center .eyebrow{font-size:19px;margin-bottom:12px}" +
    ".m-center .headline{font-size:22px}" +
    ".m-center .subtext{font-size:16px;margin-top:12px}" +
    /* Mobile: compact, pinned to the bottom so the page stays readable */
    ".card.m-bottom{left:12px;right:12px;bottom:12px;width:auto;max-width:none;padding:18px 48px 18px 18px;text-align:left}" +
    ".m-bottom .badge{display:none}" +
    ".m-bottom .eyebrow{font-size:14px;margin-bottom:4px}" +
    ".m-bottom .headline{font-size:17px}" +
    ".m-bottom .subtext{font-size:13px;margin-top:6px}" +
    ".m-bottom .cta{margin-top:12px;padding:10px 18px;font-size:15px}" +
    ".m-bottom .close{top:6px;right:6px}" +
    "@media (prefers-reduced-motion:reduce){.card,.card.is-open{transition:opacity .2s linear;transform:none}" +
    ".card.m-center,.card.m-center.is-open{transform:translate(-50%,-50%)}}" +
    "@media print{.card{display:none}}";

  var AWARD_SVG =
    '<svg class="badge" viewBox="0 0 64 72" aria-hidden="true" focusable="false">' +
    '<path d="M19 42 8 66l11-3.5L24.5 72 32 52Z" fill="var(--pp-accent)"/>' +
    '<path d="M45 42 56 66l-11-3.5L39.5 72 32 52Z" fill="var(--pp-accent)"/>' +
    '<circle cx="32" cy="28" r="27" fill="var(--pp-accent)"/>' +
    '<circle cx="32" cy="28" r="21" fill="none" stroke="var(--pp-bg)" stroke-opacity=".55" stroke-width="3"/>' +
    '<path d="M32 17 34.7 24.28 42.46 24.6 36.37 29.42 38.47 36.9 32 32.6 25.53 36.9 27.63 29.42 21.54 24.6 29.3 24.28Z" fill="var(--pp-bg)" fill-opacity=".55"/>' +
    "</svg>";

  var CLOSE_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 2l12 12M14 2 2 14" ' +
    'stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // "*Holiday* Specials" -> <em>Holiday</em> Specials, without parsing any HTML.
  function richText(node, s) {
    s.split("*").forEach(function (part, i) {
      if (!part) return;
      node.appendChild(i % 2 ? el("em", "", part) : document.createTextNode(part));
    });
  }

  var host, card, timer, shown = false;

  function build() {
    host = document.createElement("div");
    host.id = "wm4d-promo-popup";
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

    host.style.setProperty("--pp-bg", cfg.bg);
    host.style.setProperty("--pp-accent", cfg.accent);
    host.style.setProperty("--pp-text", cfg.text);
    if (cfg.font) host.style.setProperty("--pp-font", cfg.font);

    var style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);

    card = el("div", "card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "false");
    card.setAttribute("aria-labelledby", "pp-headline");

    if (cfg.icon === "award") {
      card.insertAdjacentHTML("beforeend", AWARD_SVG);
    } else if (cfg.icon !== "none") {
      var img = el("img", "badge");
      img.src = cfg.icon;
      img.alt = "";
      card.appendChild(img);
    }

    var close = el("button", "close");
    close.type = "button";
    close.setAttribute("aria-label", "Close offer");
    close.innerHTML = CLOSE_SVG;
    close.addEventListener("click", function () {
      hide();
      remember();
      emit("close");
    });
    card.appendChild(close);

    if (cfg.eyebrow) {
      var eb = el("p", "eyebrow");
      richText(eb, cfg.eyebrow);
      card.appendChild(eb);
    }
    var h = el("p", "headline");
    h.id = "pp-headline";
    richText(h, cfg.headline);
    card.appendChild(h);
    if (cfg.subtext) {
      var st = el("p", "subtext");
      richText(st, cfg.subtext);
      card.appendChild(st);
    }

    if (cfg.link) {
      var isChat = cfg.link.toLowerCase() === "chat";
      var cta = el(isChat ? "button" : "a", "cta", cfg.cta);
      if (isChat) cta.type = "button";
      else cta.href = cfg.link;
      cta.addEventListener("click", function () {
        emit("click");
        remember();
        hide();
        if (isChat && window.wm4dGhlChat) window.wm4dGhlChat.open();
      });
      card.appendChild(cta);
    }

    root.appendChild(card);
    document.body.appendChild(host);

    applyLayout();
    if (mq.addEventListener) mq.addEventListener("change", applyLayout);
    else if (mq.addListener) mq.addListener(applyLayout);

    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.key === "Esc") && shown) {
        hide();
        remember();
        emit("close");
      }
    });
  }

  function applyLayout() {
    if (!card) return;
    card.classList.remove("m-center", "m-bottom");
    if (mq.matches) {
      if (cfg.mobile === "off") return hide();
      card.classList.add(cfg.mobile === "bottom" ? "m-bottom" : "m-center");
    }
  }

  function show() {
    if (!host) build();
    if (mobileOff()) return;
    // Force a style flush so the opening transition runs. (Not requestAnimationFrame: browsers
    // pause it in background tabs, which would leave the card invisible.)
    void card.offsetWidth;
    card.classList.add("is-open");
    if (!shown) emit("show");
    shown = true;
  }

  function hide() {
    clearTimeout(timer);
    if (card) card.classList.remove("is-open");
    shown = false;
  }

  window.wm4dPromoPopup = {
    show: show,
    hide: hide,
    reset: forget
  };

  function init() {
    if (!inDateWindow() || excludedPath() || isDismissed() || mobileOff()) return;
    timer = setTimeout(show, cfg.delay);
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);
})();
