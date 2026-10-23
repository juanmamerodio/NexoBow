import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import SpecialtiesShowcase from "./components/SpecialtiesShowcase.astro";
import TechnologyDiagnostics from "./components/TechnologyDiagnostics.astro";
import MedicalTeam from "./components/MedicalTeam.astro";
import PatientJourney from "./components/PatientJourney.astro";
import FacilitiesShowcase from "./components/FacilitiesShowcase.astro";
import ClinicalReviews from "./components/ClinicalReviews.astro";
import BookingScheduler from "./components/BookingScheduler.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

// Legacy components / aliases for compatibility with legacy client fiches
import Problem from "./components/Problem.astro";
import Steps from "./components/Steps.astro";
import Reviews from "./components/Reviews.astro";
import CaseStudy from "./components/CaseStudy.astro";
import Pricing from "./components/Pricing.astro";

import { resolveOrder, SECTION_NAV } from "./order";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  SpecialtiesShowcase,
  TechnologyDiagnostics,
  MedicalTeam,
  PatientJourney,
  FacilitiesShowcase,
  ClinicalReviews,
  BookingScheduler,
  Problem,
  Steps,
  Reviews,
  CaseStudy,
  Pricing,
  Faq,
  FinalCta,
};

export { resolveOrder, SECTION_NAV };
