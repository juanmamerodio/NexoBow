import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import SymptomAssessment from "./components/SymptomAssessment.astro";
import TreatmentProtocol from "./components/TreatmentProtocol.astro";
import ClinicalOutcomes from "./components/ClinicalOutcomes.astro";
import MedicalBooking from "./components/MedicalBooking.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

// Legacy aliases for full backward compatibility with client fiches
const Problem = SymptomAssessment;
const Steps = TreatmentProtocol;
const Reviews = ClinicalOutcomes;
const CaseStudy = ClinicalOutcomes;
const Pricing = MedicalBooking;
const BookingSection = MedicalBooking;

import { resolveOrder, SECTION_NAV } from "./order.ts";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  SymptomAssessment,
  TreatmentProtocol,
  ClinicalOutcomes,
  MedicalBooking,
  Problem,
  Steps,
  Reviews,
  CaseStudy,
  Pricing,
  BookingSection,
  Faq,
  FinalCta,
};

export { resolveOrder, SECTION_NAV };
