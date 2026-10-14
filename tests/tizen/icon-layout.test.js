"use strict";
var assert = require("assert");
var fs = require("fs");
var css = fs.readFileSync(require.resolve("../../samsung/Vemm/css/style.css"), "utf8");
assert(/\.menu-control::before\s*\{\s*display:\s*none;/.test(css),
    "Text-first controls must not render decorative menu glyphs");
assert(/\.playback-controls \.menu-control::before\s*\{\s*display:\s*block;/.test(css),
    "Playback keeps functional transport glyphs where the controls intentionally hide text");
assert(/\.browse-header \.account-control\[data-avatar="true"\]\s*\{[^}]*width:\s*6vh/s.test(css),
    "A decoded profile image remains a compact functional identity control");
assert(/\.browse-header \.account-control\s*\{[^}]*min-width:\s*112px/s.test(css),
    "Account keeps a readable text fallback when profile artwork is unavailable");
var shelf = /\.screen-home\s+\.shelf-row\s*\{([^}]+)\}/.exec(css);
assert(shelf && /margin-left:\s*-1vw/.test(shelf[1]) && /padding:\s*1\.5vh\s+1vw\s+1vh/.test(shelf[1]),
    "Home shelves need left overscan for a scaled first poster/caption without moving the 5vw inset");
console.log("Tizen text-first controls, functional playback glyphs and profile identity regression: passed");
