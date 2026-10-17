import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../src/en/comix/assets/chapter_pages.js", import.meta.url), "utf8");
const chapterPages = (0, eval)(`(${source})`);
globalThis.document = { readyState: "complete" };

const failWith = (error) => () => async () => async () => {
    throw error;
};

const rejectionOf = (siteApi) => new Promise((resolve, reject) => {
    chapterPages(siteApi, 1, () => reject(new Error("should not pass")), resolve);
});

test("403 with a JSON body shows the reply", async () => {
    const message = await rejectionOf(failWith({ response: { status: 403, data: { error: "captcha_required" } } }));
    assert.equal(message, 'Chapter pages failed: HTTP 403 · reply: {"error":"captcha_required"}');
});

test("a text body is cut to 200 characters", async () => {
    const message = await rejectionOf(failWith({ response: { status: 403, data: "x".repeat(500) } }));
    assert.equal(message, `Chapter pages failed: HTTP 403 · reply: ${"x".repeat(200)}`);
});

test("an error without a response keeps the upstream text", async () => {
    const message = await rejectionOf(failWith(new Error("boom")));
    assert.equal(message, "Chapter pages failed: boom");
});
