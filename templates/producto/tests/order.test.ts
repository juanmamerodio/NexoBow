import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrder, SECTION_KEYS } from "../src/order.ts";

test("resolveOrder normaliza aliases heredados a secciones canónicas de hardware sin duplicar", () => {
  const order = ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  assert.deepEqual(resolveOrder(order), [
    "Hero",
    "OpticalEngineering",
    "MaterialsCraftsmanship",
    "CustomerExperiences",
    "OrderCheckoutSection",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder soporta las secciones auténticas de Heavn One", () => {
  const hardwareOrder = [
    "Hero",
    "OpticalEngineering",
    "MaterialsCraftsmanship",
    "CustomerExperiences",
    "OrderCheckoutSection",
  ];
  assert.deepEqual(resolveOrder(hardwareOrder), [...hardwareOrder, "Faq", "FinalCta"]);
});

test("resolveOrder no duplica secciones repetidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Hero", "OrderCheckoutSection"]), [
    "Hero",
    "OrderCheckoutSection",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder filtra claves desconocidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Fake", "OpticalEngineering"]), [
    "Hero",
    "OpticalEngineering",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder no duplica Faq/FinalCta si ya vienen en el orden", () => {
  assert.deepEqual(resolveOrder(["Hero", "Faq"]), ["Hero", "Faq", "FinalCta"]);
  assert.deepEqual(resolveOrder(["Hero", "FinalCta"]), ["Hero", "FinalCta", "Faq"]);
});

test("resolveOrder con orden vacío devuelve solo el cierre del embudo", () => {
  assert.deepEqual(resolveOrder([]), ["Faq", "FinalCta"]);
});

test("todas las secciones auténticas de Heavn One son conocidas", () => {
  assert.ok(SECTION_KEYS.includes("Hero"));
  assert.ok(SECTION_KEYS.includes("OpticalEngineering"));
  assert.ok(SECTION_KEYS.includes("MaterialsCraftsmanship"));
  assert.ok(SECTION_KEYS.includes("CustomerExperiences"));
  assert.ok(SECTION_KEYS.includes("OrderCheckoutSection"));
  assert.ok(SECTION_KEYS.includes("FinalCta"));
});
