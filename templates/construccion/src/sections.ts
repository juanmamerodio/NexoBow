import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import IndustrialCapabilities from "./components/IndustrialCapabilities.astro";
import CompletedProjects from "./components/CompletedProjects.astro";
import SafetyCertifications from "./components/SafetyCertifications.astro";
import QuoteEstimationSection from "./components/QuoteEstimationSection.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

// Legacy aliases for full backward compatibility with client fiches
const Problem = IndustrialCapabilities;
const Steps = CompletedProjects;
const Reviews = CompletedProjects;
const CaseStudy = CompletedProjects;
const Pricing = QuoteEstimationSection;
const BookingSection = QuoteEstimationSection;

import { resolveOrder, SECTION_NAV } from "./order";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  IndustrialCapabilities,
  CompletedProjects,
  SafetyCertifications,
  QuoteEstimationSection,
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
