import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrder, SECTION_KEYS } from "../src/order.ts";

test("resolveOrder normaliza aliases heredados a secciones canónicas sin duplicar", () => {
  const order = ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  assert.deepEqual(resolveOrder(order), [
    "Hero",
    "DevelopmentSpecs",
    "InvestmentProcess",
    "PropertyShowcase",
    "PrivateTourBooking",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder soporta las secciones auténticas de Lufte Propiedades", () => {
  const architecturalOrder = [
    "Hero",
    "PropertyShowcase",
    "DevelopmentSpecs",
    "InvestmentProcess",
    "PrivateTourBooking",
  ];
  assert.deepEqual(resolveOrder(architecturalOrder), [...architecturalOrder, "Faq", "FinalCta"]);
});

test("resolveOrder no duplica secciones repetidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Hero", "PrivateTourBooking"]), [
    "Hero",
    "PrivateTourBooking",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder filtra claves desconocidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "UnknownBlock", "PropertyShowcase"]), [
    "Hero",
    "PropertyShowcase",
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

test("todas las secciones auténticas de Lufte Propiedades son conocidas", () => {
  assert.ok(SECTION_KEYS.includes("Hero"));
  assert.ok(SECTION_KEYS.includes("PropertyShowcase"));
  assert.ok(SECTION_KEYS.includes("DevelopmentSpecs"));
  assert.ok(SECTION_KEYS.includes("InvestmentProcess"));
  assert.ok(SECTION_KEYS.includes("PrivateTourBooking"));
  assert.ok(SECTION_KEYS.includes("FinalCta"));
});
