import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import PropertyShowcase from "./components/PropertyShowcase.astro";
import DevelopmentSpecs from "./components/DevelopmentSpecs.astro";
import InvestmentProcess from "./components/InvestmentProcess.astro";
import PrivateTourBooking from "./components/PrivateTourBooking.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

// Legacy aliases for full backward compatibility with client fiches
const Problem = DevelopmentSpecs;
const Steps = InvestmentProcess;
const Reviews = PropertyShowcase;
const CaseStudy = PropertyShowcase;
const Pricing = PrivateTourBooking;
const BookingSection = PrivateTourBooking;

import { resolveOrder, SECTION_NAV } from "./order.ts";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  PropertyShowcase,
  DevelopmentSpecs,
  InvestmentProcess,
  PrivateTourBooking,
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
