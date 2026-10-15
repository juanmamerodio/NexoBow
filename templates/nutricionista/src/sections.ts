import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Hero from "./components/Hero.astro";
import Problem from "./components/Problem.astro";
import Steps from "./components/Steps.astro";
import Reviews from "./components/Reviews.astro";
import CaseStudy from "./components/CaseStudy.astro";
import Pricing from "./components/Pricing.astro";
import Faq from "./components/Faq.astro";
import FinalCta from "./components/FinalCta.astro";

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

export const SECTION_NAV = [
  { key: "Problem", href: "#problema", label: "El problema" },
  { key: "Steps", href: "#metodo", label: "Método" },
  { key: "Reviews", href: "#opiniones", label: "Opiniones" },
  { key: "CaseStudy", href: "#casos", label: "Casos" },
  { key: "Pricing", href: "#precios", label: "Precios" },
  { key: "Faq", href: "#faq", label: "Preguntas" },
];

export function resolveOrder(order: string[]): string[] {
  const out: string[] = [];
  for (const key of [...order, "Faq", "FinalCta"]) {
    if (SECTIONS[key] && !out.includes(key)) out.push(key);
  }
  return out;
}