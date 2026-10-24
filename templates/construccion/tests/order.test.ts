import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrder, SECTION_KEYS } from "../src/order.ts";

test("resolveOrder normaliza aliases heredados a secciones canónicas de construccion", () => {
  const order = ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  assert.deepEqual(resolveOrder(order), [
    "Hero",
    "IndustrialCapabilities",
    "CompletedProjects",
    "QuoteEstimationSection",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder soporta las secciones auténticas de Reliable Paving", () => {
  const authenticOrder = [
    "Hero",
    "IndustrialCapabilities",
    "CompletedProjects",
    "SafetyCertifications",
    "QuoteEstimationSection",
  ];
  assert.deepEqual(resolveOrder(authenticOrder), [
    ...authenticOrder,
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder no duplica secciones repetidas", () => {
  assert.deepEqual(
    resolveOrder(["Hero", "Hero", "QuoteEstimationSection"]),
    ["Hero", "QuoteEstimationSection", "Faq", "FinalCta"]
  );
});

test("resolveOrder filtra claves desconocidas", () => {
  assert.deepEqual(
    resolveOrder(["Hero", "NonExistentSection", "IndustrialCapabilities"]),
    ["Hero", "IndustrialCapabilities", "Faq", "FinalCta"]
  );
});

test("resolveOrder no duplica Faq o FinalCta si ya están presentes", () => {
  assert.deepEqual(
    resolveOrder(["Hero", "Faq"]),
    ["Hero", "Faq", "FinalCta"]
  );
  assert.deepEqual(
    resolveOrder(["Hero", "FinalCta"]),
    ["Hero", "FinalCta", "Faq"]
  );
});

test("todas las secciones auténticas de construccion están definidas en SECTION_KEYS", () => {
  assert.ok(SECTION_KEYS.includes("Hero"));
  assert.ok(SECTION_KEYS.includes("IndustrialCapabilities"));
  assert.ok(SECTION_KEYS.includes("CompletedProjects"));
  assert.ok(SECTION_KEYS.includes("SafetyCertifications"));
  assert.ok(SECTION_KEYS.includes("QuoteEstimationSection"));
  assert.ok(SECTION_KEYS.includes("Faq"));
  assert.ok(SECTION_KEYS.includes("FinalCta"));
});
