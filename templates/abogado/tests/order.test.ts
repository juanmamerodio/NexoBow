import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrder, SECTION_KEYS } from "../src/order.ts";

test("resolveOrder respeta el orden del tema Kümmerlein y agrega Faq + FinalCta al final", () => {
  const order = [
    "Hero",
    "ValueProposition",
    "PracticeAreas",
    "Attorneys",
    "CaseResults",
    "ConsultationCta",
  ];
  assert.deepEqual(resolveOrder(order), [...order, "Faq", "FinalCta"]);
});

test("resolveOrder mantiene retrocompatibilidad con claves clásicas de fichas", () => {
  const order = ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  assert.deepEqual(resolveOrder(order), [...order, "Faq", "FinalCta"]);
});

test("resolveOrder no duplica secciones repetidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Hero", "ConsultationCta"]), [
    "Hero",
    "ConsultationCta",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder filtra claves desconocidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Fake", "PracticeAreas"]), [
    "Hero",
    "PracticeAreas",
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

test("todas las secciones propias de Kümmerlein están registradas", () => {
  assert.ok(SECTION_KEYS.includes("Hero"));
  assert.ok(SECTION_KEYS.includes("ValueProposition"));
  assert.ok(SECTION_KEYS.includes("PracticeAreas"));
  assert.ok(SECTION_KEYS.includes("Attorneys"));
  assert.ok(SECTION_KEYS.includes("CaseResults"));
  assert.ok(SECTION_KEYS.includes("ConsultationCta"));
  assert.ok(SECTION_KEYS.includes("FinalCta"));
});
