// tests/archetype-decoupling.test.mjs — Suite TDD para Desacoplamiento de Arquetipos Visuales (AC-01 / TICK-01)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveTemplateArchetype,
  resolveTemplateSourceDirectory,
  resolveTemplateVersion,
  RUBRO_TO_ARCHETYPE_MAP,
  ARCHETYPE_ALIASES,
} from "../scripts/build-client-site.mjs";

test("T-ARC-01: resolveTemplateArchetype infiere arquetipo desde template_archetype o retrocompatible desde rubro", () => {
  // 1. Si template_archetype está presente, tiene prioridad
  assert.equal(
    resolveTemplateArchetype({ template_archetype: "editorial-classic", rubro: "nutricionista" }),
    "editorial-classic"
  );
  assert.equal(
    resolveTemplateArchetype({ template_archetype: "obsidian-authority", rubro: "abogado" }),
    "obsidian-authority"
  );

  // 2. Si template_archetype no está presente, infiere a través de rubro
  assert.equal(
    resolveTemplateArchetype({ rubro: "nutricionista" }),
    "editorial-classic"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "psicologo" }),
    "editorial-classic"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "abogado" }),
    "obsidian-authority"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "clinica" }),
    "architectural-prestige"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "corporativo" }),
    "high-ticket-consulting"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "consultor" }),
    "high-ticket-consulting"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "tech" }),
    "tech-editorial-system"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "software" }),
    "tech-editorial-system"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "deportes" }),
    "kinetic-performance"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "gym" }),
    "kinetic-performance"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "dermatologia" }),
    "clinical-pure"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "medico" }),
    "clinical-pure"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "producto" }),
    "minimalist-hardware"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "hardware" }),
    "minimalist-hardware"
  );
  assert.equal(
    resolveTemplateArchetype({ template_archetype: "minimalist-hardware" }),
    "minimalist-hardware"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "construccion" }),
    "industrial-authority"
  );
  assert.equal(
    resolveTemplateArchetype({ rubro: "pavimentacion" }),
    "industrial-authority"
  );
  assert.equal(
    resolveTemplateArchetype({ template_archetype: "industrial-authority" }),
    "industrial-authority"
  );

  // 3. Fallback seguro si no hay datos
  assert.equal(
    resolveTemplateArchetype({}),
    "editorial-classic"
  );
});

test("T-ARC-02: resolveTemplateSourceDirectory mapea nombres de arquetipo y rubros a directorios físicos existentes", () => {
  // 'editorial-classic' mapea físicamente al template 'nutricionista' (o 'editorial-classic' si existiera la carpeta)
  const dirFromArchetype = resolveTemplateSourceDirectory("editorial-classic");
  assert.ok(dirFromArchetype.endsWith("templates/nutricionista") || dirFromArchetype.endsWith("templates/editorial-classic"));

  // 'obsidian-authority' mapea físicamente al template 'abogado'
  const dirFromObsidian = resolveTemplateSourceDirectory("obsidian-authority");
  assert.ok(dirFromObsidian.endsWith("templates/abogado"));

  // 'abogado' mapea físicamente a templates/abogado
  const dirFromRubroAbogado = resolveTemplateSourceDirectory("abogado");
  assert.ok(dirFromRubroAbogado.endsWith("templates/abogado"));

  // 'architectural-prestige' mapea físicamente al template 'clinica'
  const dirFromArchitectural = resolveTemplateSourceDirectory("architectural-prestige");
  assert.ok(dirFromArchitectural.endsWith("templates/clinica"));

  // 'clinica' mapea físicamente a templates/clinica
  const dirFromRubroClinica = resolveTemplateSourceDirectory("clinica");
  assert.ok(dirFromRubroClinica.endsWith("templates/clinica"));

  // 'high-ticket-consulting' mapea físicamente al template 'corporativo'
  const dirFromHighTicket = resolveTemplateSourceDirectory("high-ticket-consulting");
  assert.ok(dirFromHighTicket.endsWith("templates/corporativo"));

  // 'corporativo' mapea físicamente a templates/corporativo
  const dirFromRubroCorporativo = resolveTemplateSourceDirectory("corporativo");
  assert.ok(dirFromRubroCorporativo.endsWith("templates/corporativo"));

  // 'tech-editorial-system' mapea físicamente al template 'tech'
  const dirFromTechSystem = resolveTemplateSourceDirectory("tech-editorial-system");
  assert.ok(dirFromTechSystem.endsWith("templates/tech"));

  // 'tech' mapea físicamente a templates/tech
  const dirFromRubroTech = resolveTemplateSourceDirectory("tech");
  assert.ok(dirFromRubroTech.endsWith("templates/tech"));

  // 'kinetic-performance' mapea físicamente al template 'deportes'
  const dirFromKinetic = resolveTemplateSourceDirectory("kinetic-performance");
  assert.ok(dirFromKinetic.endsWith("templates/deportes"));

  // 'deportes' mapea físicamente a templates/deportes
  const dirFromRubroDeportes = resolveTemplateSourceDirectory("deportes");
  assert.ok(dirFromRubroDeportes.endsWith("templates/deportes"));

  // 'clinical-pure' mapea físicamente al template 'dermatologia'
  const dirFromClinical = resolveTemplateSourceDirectory("clinical-pure");
  assert.ok(dirFromClinical.endsWith("templates/dermatologia"));

  // 'dermatologia' mapea físicamente a templates/dermatologia
  const dirFromRubroDermato = resolveTemplateSourceDirectory("dermatologia");
  assert.ok(dirFromRubroDermato.endsWith("templates/dermatologia"));

  // 'minimalist-hardware' mapea físicamente al template 'producto'
  const dirFromHardware = resolveTemplateSourceDirectory("minimalist-hardware");
  assert.ok(dirFromHardware.endsWith("templates/producto"));

  // 'producto' mapea físicamente a templates/producto
  const dirFromRubroProducto = resolveTemplateSourceDirectory("producto");
  assert.ok(dirFromRubroProducto.endsWith("templates/producto"));

  // 'industrial-authority' mapea físicamente al template 'construccion'
  const dirFromIndustrial = resolveTemplateSourceDirectory("industrial-authority");
  assert.ok(dirFromIndustrial.endsWith("templates/construccion"));

  // 'construccion' mapea físicamente a templates/construccion
  const dirFromRubroConstruccion = resolveTemplateSourceDirectory("construccion");
  assert.ok(dirFromRubroConstruccion.endsWith("templates/construccion"));

  // 'nutricionista' mapea físicamente a templates/nutricionista
  const dirFromRubro = resolveTemplateSourceDirectory("nutricionista");
  assert.ok(dirFromRubro.endsWith("templates/nutricionista"));
});

test("T-ARC-03: resolveTemplateVersion soporta tanto versión de arquetipo como de rubro heredado", () => {
  // 1. Con template_version explícito
  assert.equal(
    resolveTemplateVersion({ template_version: "editorial-classic@1.0.0" }),
    "editorial-classic@1.0.0"
  );
  assert.equal(
    resolveTemplateVersion({ template_version: "nutricionista@1.0.0" }),
    "nutricionista@1.0.0"
  );

  // 2. Si no hay template_version pero hay template_archetype
  assert.equal(
    resolveTemplateVersion({ template_archetype: "editorial-classic" }, "1.0.0"),
    "editorial-classic@1.0.0"
  );

  // 3. Si no hay template_version ni template_archetype, cae a rubro@1.0.0
  assert.equal(
    resolveTemplateVersion({ rubro: "nutricionista" }, "1.0.0"),
    "nutricionista@1.0.0"
  );
});
