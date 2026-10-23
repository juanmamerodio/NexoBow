import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import StrategicGrid from "./components/StrategicGrid.astro";
import ConsultingRoadmap from "./components/ConsultingRoadmap.astro";
import RoiMetrics from "./components/RoiMetrics.astro";
import BookingSection from "./components/BookingSection.astro";
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
  StrategicGrid,
  ConsultingRoadmap,
  RoiMetrics,
  BookingSection,
  Problem,
  Steps,
  Reviews,
  CaseStudy,
  Pricing,
  Faq,
  FinalCta,
};

export { resolveOrder, SECTION_NAV };
