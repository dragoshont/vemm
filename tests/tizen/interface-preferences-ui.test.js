"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");
var data = {};
var failStorage = false;

function fixture() {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only", pretendToBeVisual: true
    });
    var window = dom.window;
    Object.defineProperty(window, "localStorage", { value: {
        getItem: function (key) { return data[key] || null; },
        setItem: function (key, value) {
            if (failStorage) { throw new Error("Synthetic storage refusal"); }
            data[key] = value;
        },
        removeItem: function (key) { delete data[key]; }
    } });
    window.fetch = function () { assert.fail("Interface preferences never need a server"); };
    var style = window.document.createElement("style");
    style.textContent = fs.readFileSync(path.join(app, "css/style.css"), "utf8");
    window.document.head.appendChild(style);
    ["js/i18n.js", "js/preferences.js"].forEach(function (file) {
        window.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    source = source.slice(0, source.lastIndexOf('    addConnectForm("");')) + "    openSettings(); }());";
    window.eval(source);
    function find(text) {
        var node = Array.from(window.document.querySelectorAll("button")).find(function (button) {
            return button.textContent === text;
        });
        assert(node, "Missing remote control: " + text);
        return node;
    }
    function activate(text) {
        find(text).focus();
        window.document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        window.document.dispatchEvent(new window.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
    }
    return { dom: dom, window: window, activate: activate, find: find };
}

var first = fixture();
try {
    first.activate("Reduced motion: Off");
    first.activate("On");
    assert.strictEqual(first.window.document.documentElement.getAttribute("data-reduced-motion"), "true");
    assert.strictEqual(JSON.parse(data["vemm-tizen-preferences"]).reducedMotion, true);
    var animation = first.window.document.createElement("div");
    first.window.document.body.appendChild(animation);
    assert.strictEqual(first.window.getComputedStyle(animation).transition, "none");
    first.activate("Interface text: Standard");
    first.activate("Larger");
    assert.strictEqual(first.window.document.documentElement.getAttribute("data-interface-text"), "large");
    assert.strictEqual(first.window.getComputedStyle(first.window.document.querySelector(".help-text")).fontSize, "30px");
    failStorage = true;
    first.activate("Reduced motion: On");
    first.activate("Off");
    assert(first.window.document.getElementById("status").textContent.includes("Could not save preferences"));
    assert.strictEqual(first.window.document.documentElement.getAttribute("data-reduced-motion"), "true");
    first.activate("Back");
    first.find("Reduced motion: On");
    failStorage = false;
} finally { first.dom.window.close(); }
var second = fixture();
try {
    assert.strictEqual(second.window.document.documentElement.getAttribute("data-reduced-motion"), "true",
        "The manual preference applies on legacy runtimes without a reduced-motion media query");
    assert.strictEqual(second.window.document.documentElement.getAttribute("data-interface-text"), "large");
    second.activate("Reset preferences");
    assert.strictEqual(second.window.document.documentElement.getAttribute("data-reduced-motion"), "false");
    assert.strictEqual(second.window.document.documentElement.getAttribute("data-interface-text"), "standard");
} finally { second.dom.window.close(); }
console.log("Tizen manual interface text/reduced-motion remote persistence and storage refusal: passed");
