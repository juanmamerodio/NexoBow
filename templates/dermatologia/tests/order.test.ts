import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrder, SECTION_KEYS } from "../src/order.ts";

test("resolveOrder normaliza aliases heredados a secciones canónicas sin duplicar", () => {
  const order = ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  assert.deepEqual(resolveOrder(order), [
    "Hero",
    "SymptomAssessment",
    "TreatmentProtocol",
    "ClinicalOutcomes",
    "MedicalBooking",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder soporta las secciones auténticas de Lipedema Guru", () => {
  const clinicalOrder = [
    "Hero",
    "SymptomAssessment",
    "TreatmentProtocol",
    "ClinicalOutcomes",
    "MedicalBooking",
  ];
  assert.deepEqual(resolveOrder(clinicalOrder), [...clinicalOrder, "Faq", "FinalCta"]);
});

test("resolveOrder no duplica secciones repetidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Hero", "MedicalBooking"]), [
    "Hero",
    "MedicalBooking",
    "Faq",
    "FinalCta",
  ]);
});

test("resolveOrder filtra claves desconocidas", () => {
  assert.deepEqual(resolveOrder(["Hero", "Fake", "SymptomAssessment"]), [
    "Hero",
    "SymptomAssessment",
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

test("todas las secciones auténticas de Lipedema Guru son conocidas", () => {
  assert.ok(SECTION_KEYS.includes("Hero"));
  assert.ok(SECTION_KEYS.includes("SymptomAssessment"));
  assert.ok(SECTION_KEYS.includes("TreatmentProtocol"));
  assert.ok(SECTION_KEYS.includes("ClinicalOutcomes"));
  assert.ok(SECTION_KEYS.includes("MedicalBooking"));
  assert.ok(SECTION_KEYS.includes("FinalCta"));
});
