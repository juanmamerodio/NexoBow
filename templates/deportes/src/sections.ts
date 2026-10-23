import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import AthleticAssessment from "./components/AthleticAssessment.astro";
import TrainingPeriodization from "./components/TrainingPeriodization.astro";
import AthleteTransformations from "./components/AthleteTransformations.astro";
import TrialBooking from "./components/TrialBooking.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

// Legacy aliases for full backward compatibility with client fiches
const Problem = AthleticAssessment;
const Steps = TrainingPeriodization;
const Reviews = AthleteTransformations;
const CaseStudy = AthleteTransformations;
const Pricing = TrialBooking;
const BookingSection = TrialBooking;

import { resolveOrder, SECTION_NAV } from "./order";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  AthleticAssessment,
  TrainingPeriodization,
  AthleteTransformations,
  TrialBooking,
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
