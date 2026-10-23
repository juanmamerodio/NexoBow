import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import SystemChallenges from "./components/SystemChallenges.astro";
import TransformationPhases from "./components/TransformationPhases.astro";
import ClientCaseStudies from "./components/ClientCaseStudies.astro";
import DiscoveryBooking from "./components/DiscoveryBooking.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

// Legacy components / aliases for compatibility with client fiches
const Problem = SystemChallenges;
const Steps = TransformationPhases;
const Reviews = ClientCaseStudies;
const CaseStudy = ClientCaseStudies;
const Pricing = DiscoveryBooking;
const BookingSection = DiscoveryBooking;

import { resolveOrder, SECTION_NAV } from "./order";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  SystemChallenges,
  TransformationPhases,
  ClientCaseStudies,
  DiscoveryBooking,
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
