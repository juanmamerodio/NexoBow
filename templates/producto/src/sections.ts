import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import OpticalEngineering from "./components/OpticalEngineering.astro";
import MaterialsCraftsmanship from "./components/MaterialsCraftsmanship.astro";
import CustomerExperiences from "./components/CustomerExperiences.astro";
import OrderCheckoutSection from "./components/OrderCheckoutSection.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

// Legacy aliases for full backward compatibility with client fiches
const Problem = OpticalEngineering;
const Steps = MaterialsCraftsmanship;
const Reviews = CustomerExperiences;
const CaseStudy = CustomerExperiences;
const Pricing = OrderCheckoutSection;
const BookingSection = OrderCheckoutSection;

import { resolveOrder, SECTION_NAV } from "./order";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  OpticalEngineering,
  MaterialsCraftsmanship,
  CustomerExperiences,
  OrderCheckoutSection,
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
