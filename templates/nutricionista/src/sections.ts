import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import Problem from "./components/Problem.astro";
import Steps from "./components/Steps.astro";
import Reviews from "./components/Reviews.astro";
import CaseStudy from "./components/CaseStudy.astro";
import Pricing from "./components/Pricing.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

import { resolveOrder, SECTION_NAV } from "./order";

export const SECTIONS: Record<string, AstroComponentFactory> = {
  Hero,
  Problem,
  Steps,
  Reviews,
  CaseStudy,
  Pricing,
  Faq,
  FinalCta,
};

export { resolveOrder, SECTION_NAV };
