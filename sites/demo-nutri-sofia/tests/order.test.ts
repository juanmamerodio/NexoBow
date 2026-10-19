import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrder, SECTION_KEYS } from "../src/order.ts";

test("resolveOrder respeta el orden del tema y agrega Faq + FinalCta al final", () => {
  const order = ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  assert.deepEqual(resolveOrder(order), [...order, "Faq", "FinalCta"]);
});

test("resolveOrder no duplica secciones repetidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Hero", "Pricing"]), ["Hero", "Pricing", "Faq", "FinalCta"]);
});

test("resolveOrder filtra claves desconocidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Fake", "Steps"]), ["Hero", "Steps", "Faq", "FinalCta"]);
});

test("resolveOrder no duplica Faq/FinalCta si ya vienen en el orden", () => {
  assert.deepEqual(resolveOrder(["Hero", "Faq"]), ["Hero", "Faq", "FinalCta"]);
  assert.deepEqual(resolveOrder(["Hero", "FinalCta"]), ["Hero", "FinalCta", "Faq"]);
});

test("resolveOrder con orden vacío devuelve solo el cierre del embudo", () => {
  assert.deepEqual(resolveOrder([]), ["Faq", "FinalCta"]);
});

test("todas las secciones del orden son conocidas", () => {
  assert.ok(SECTION_KEYS.includes("Hero"));
  assert.ok(SECTION_KEYS.includes("FinalCta"));
});
