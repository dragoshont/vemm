"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var css = fs.readFileSync(path.resolve(__dirname, "../../samsung/Vemm/css/style.css"), "utf8");

[
    "#0f2747",
    "#5e7fa7",
    "#d6e6f5",
    "#d7dbe3",
    "#4b5c63"
].forEach(function (color) {
    assert(css.indexOf(color) !== -1, "Blue Calm semantic color is missing: " + color);
});

assert(/\/\* Blue Calm semantic roles:[\s\S]+canvas[\s\S]+focus[\s\S]+selection/.test(css),
    "The legacy engine needs an explicit semantic-role map because CSS custom properties are unavailable");
var selectedNavigation = /\.home-navigation \[aria-current="page"\]\s*\{([^}]+)\}/g;
var selectedRules = [];
var selectedMatch;
while ((selectedMatch = selectedNavigation.exec(css))) { selectedRules.push(selectedMatch[1]); }
assert(selectedRules.some(function (rule) {
    return /background:\s*#0f2747/.test(rule) && /border-bottom:\s*3px solid #d6e6f5/.test(rule);
}),
    "Selected navigation needs both Blue Calm color and a non-color underline");
assert(/button:focus[\s\S]*background:\s*#d6e6f5;[\s\S]*color:\s*#0f2747;/.test(css),
    "Focused text controls must use the pale-sky/dark-navy high-contrast pair");
assert(/\.menu-control::before\s*\{\s*display:\s*none;/.test(css),
    "Decorative menu glyphs must be removed from the text-first interface");
assert(/\.browse-header \.home-navigation \.menu-control::before,[\s\S]+display:\s*none;/.test(css),
    "Specific header/icon rules must not restore decorative glyphs");
assert(/\.playback-controls \.menu-control::before\s*\{\s*display:\s*block;/.test(css),
    "Functional player controls must retain their transport glyphs");
var searchRules = Array.from(css.matchAll(/\.home-navigation \.menu-icon-search\s*\{([^}]+)\}/g));
assert(searchRules.length && /font-size:\s*2\.6vh\s*!important/.test(searchRules[searchRules.length - 1][1]),
    "Search must remain a visible text destination rather than an icon-only control");
assert(/\.home-feature-actions \.round-control,\s*\.detail-actions \.round-control,\s*\.detail-actions \.detail-pill-restart\s*\{[^}]*font-size:\s*2\.2vh/s.test(css),
    "Hero secondary actions must use readable labels instead of decorative round icons");
assert(/\.title-tile:focus\s*\{[^}]*border-color:\s*#d6e6f5;[^}]*outline:\s*2px solid #d6e6f5;[^}]*background:\s*#0f2747;[^}]*color:\s*#f5f8fc;/s.test(css),
    "Title tiles need a selector-specific Blue Calm focus shape and contrast");
assert(/@media \(max-width:\s*1400px\)\s*\{[\s\S]*\.home-hero-meta,[\s\S]*\.detail-pill,[\s\S]*font-size:\s*24px;/s.test(css),
    "720p couch copy must not fall below the 24px living-room minimum");
var reducedMotion = Array.from(css.matchAll(/@media \(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/g));
assert(reducedMotion.length && /\.screen-home \.media-card,[\s\S]*\.detail-backdrop[\s\S]*transition:\s*none/.test(
    reducedMotion[reducedMotion.length - 1][1]),
    "The final cascade must disable Home and detail transitions for reduced motion");

console.log("Vemm Blue Calm palette, focus, selection and icon-restraint contract: passed");
