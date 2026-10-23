import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrder, SECTION_KEYS } from "../src/order.ts";

test("resolveOrder normaliza aliases heredados a secciones canónicas sin duplicar", () => {
  const order = ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  assert.deepEqual(resolveOrder(order), [
    "Hero",
    "AthleticAssessment",
    "TrainingPeriodization",
    "AthleteTransformations",
    "TrialBooking",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder soporta las secciones auténticas de The Performance Lab", () => {
  const labOrder = [
    "Hero",
    "AthleticAssessment",
    "TrainingPeriodization",
    "AthleteTransformations",
    "TrialBooking",
  ];
  assert.deepEqual(resolveOrder(labOrder), [...labOrder, "Faq", "FinalCta"]);
});

test("resolveOrder no duplica secciones repetidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Hero", "TrialBooking"]), [
    "Hero",
    "TrialBooking",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder filtra claves desconocidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Fake", "AthleticAssessment"]), [
    "Hero",
    "AthleticAssessment",
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

test("todas las secciones auténticas de The Performance Lab son conocidas", () => {
  assert.ok(SECTION_KEYS.includes("Hero"));
  assert.ok(SECTION_KEYS.includes("AthleticAssessment"));
  assert.ok(SECTION_KEYS.includes("TrainingPeriodization"));
  assert.ok(SECTION_KEYS.includes("AthleteTransformations"));
  assert.ok(SECTION_KEYS.includes("TrialBooking"));
  assert.ok(SECTION_KEYS.includes("FinalCta"));
});
