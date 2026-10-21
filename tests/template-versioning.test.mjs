// tests/template-versioning.test.mjs — Verifica inmutabilidad de template_version, tags git y auditoría diferenciada (web vs sites)
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  resolveTemplateVersion,
  shouldRecloneTemplate,
  verifyTemplateTagExists
} from '../scripts/build-client-site.mjs';
import {
  auditHtmlDocument,
  DEFAULT_SITE_JS_BUDGET_BYTES
} from '../scripts/audit-site.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('T-VER-01 - shouldRecloneTemplate aísla clones existentes salvo --upgrade-template o cambio explícito de template_version', () => {
  assert.equal(resolveTemplateVersion({ rubro: 'nutricionista' }, '1.0.0'), 'nutricionista@1.0.0');
  assert.equal(resolveTemplateVersion({ rubro: 'nutricionista', template_version: 'nutricionista@1.2.0' }, '1.0.0'), 'nutricionista@1.2.0');

  // 1. Clon inicial (no existe directorio en sites/) -> debe clonar
  assert.deepEqual(
    shouldRecloneTemplate({
      siteExists: false,
      lockedVersion: null,
      requestedVersion: 'nutricionista@1.0.0',
      upgradeRequested: false
    }),
    { shouldReclone: true, reason: 'initial-clone' }
  );

  // 2. Sitio existente con misma versión y sin --upgrade-template -> NO debe reclonar el código del template
  assert.deepEqual(
    shouldRecloneTemplate({
      siteExists: true,
      lockedVersion: 'nutricionista@1.0.0',
      requestedVersion: 'nutricionista@1.0.0',
      upgradeRequested: false
    }),
    { shouldReclone: false, reason: 'locked-to-template-version' }
  );

  // 3. Operador cambia template_version en la ficha .md -> debe reclonar a la versión solicitada
  assert.deepEqual(
    shouldRecloneTemplate({
      siteExists: true,
      lockedVersion: 'nutricionista@1.0.0',
      requestedVersion: 'nutricionista@1.1.0',
      upgradeRequested: false
    }),
    { shouldReclone: true, reason: 'version-changed-in-fiche' }
  );

  // 4. Operador ejecuta --upgrade-template explícitamente -> debe reclonar y actualizar
  assert.deepEqual(
    shouldRecloneTemplate({
      siteExists: true,
      lockedVersion: 'nutricionista@1.0.0',
      requestedVersion: 'nutricionista@1.0.0',
      upgradeRequested: true
    }),
    { shouldReclone: true, reason: 'explicit-upgrade' }
  );
});

test('T-VER-02 - build-client-site verifica tags git (template/{rubro}@x.y.z), falla si la versión no existe y actualiza con --upgrade-template', () => {
  const slug = '99-test-versioning-nutri';
  const fichePath = join(REPO_ROOT, 'clients', `${slug}.md`);
  const siteDir = join(REPO_ROOT, 'sites', slug);
  const lockPath = join(siteDir, '.template-lock.json');
  const footerComponentPath = join(siteDir, 'src', 'components', 'Footer.astro');
  const siteJsonPath = join(siteDir, 'src', 'site.json');

  // Asegurar que exista el tag temporal de prueba template/nutricionista@0.9.0 para testear cambio entre dos versiones válidas
  spawnSync('git', ['tag', '-f', 'template/nutricionista@0.9.0'], { cwd: REPO_ROOT });

  const cleanup = () => {
    spawnSync('git', ['tag', '-d', 'template/nutricionista@0.9.0'], { cwd: REPO_ROOT });
    if (existsSync(fichePath)) rmSync(fichePath, { force: true });
    if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });
  };

  try {
    assert.equal(verifyTemplateTagExists('nutricionista@1.0.0'), true, 'Debe existir el tag git template/nutricionista@1.0.0');
    assert.equal(verifyTemplateTagExists('nutricionista@9.9.9'), false, 'No debe existir un tag inexistente');

    const baseFiche = (nombre, version = 'nutricionista@1.0.0') => `---
id: 99
sheet_id: 99
lead_status: "1. Prospecto Identificado"
created_at: "2026-10-21"
last_activity_at: "2026-10-21"
expires_at: "2026-10-28"
rubro: nutricionista
template_version: "${version}"
nombre: "${nombre}"
slug: "${slug}"
estado: prospecto
subdominio: "preview.nexobow.site/${slug}/"
whatsapp: "5491155559999"
calendly: ""
google_maps: "https://maps.google.com/?cid=test99"
instagram: ""
tema:
  primary: "#e70025"
  accent: "#e3c1ad"
  fondo: "#fcf3ed"
  tinta: "#35221a"
  fuente: "Fraunces"
  fuente_sans: "Archivo"
  orden_secciones: ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"]
consentimiento_testimonios: false
setup_ars: 189999
abono_ars: 12259
mes_de_prueba: true
---

## Bio
Especialista en nutrición clínica.

## Enfoque
Planes reales sin efecto rebote.

## Reseñas
- **Paciente (Google Maps)**: "Excelente profesional."

## Casos de éxito
- **Caso 1**: Mejora de hábitos. Resultado: -5 kg en 2 meses.

## Preguntas frecuentes
- **¿Primera consulta sin cargo?**: Sí, 100% bonificada.
`;

    // Paso 0: Solicitar una versión inexistente falla con mensaje claro
    writeFileSync(fichePath, baseFiche('Lic. Prueba Inexistente', 'nutricionista@9.9.9'), 'utf8');
    const resMissing = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(resMissing.status, 1, 'Debe fallar con código 1 si el tag de template no existe');
    assert.match(resMissing.stderr, /template\/nutricionista@9\.9\.9/);

    // Paso 1: Creación inicial del sitio en v0.9.0
    writeFileSync(fichePath, baseFiche('Lic. Prueba Inicial', 'nutricionista@0.9.0'), 'utf8');
    const res1 = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(res1.status, 0, `Fallo en clon inicial: ${res1.stderr}`);
    assert.ok(existsSync(lockPath), 'Debe crearse .template-lock.json en sites/{slug}');
    const lock1 = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(lock1.template_version, 'nutricionista@0.9.0');

    // Simular que el clon del prestador tiene su versión congelada de Footer.astro
    const frozenMarker = '<!-- FROZEN_CLIENT_TEMPLATE_V0_9_0 -->';
    const originalFooter = readFileSync(footerComponentPath, 'utf8');
    writeFileSync(footerComponentPath, `${originalFooter}\n${frozenMarker}\n`, 'utf8');

    // Paso 2: Re-ejecutar build-client-site tras editar datos de la ficha SIN --upgrade-template
    writeFileSync(fichePath, baseFiche('Lic. Prueba Actualizada', 'nutricionista@0.9.0'), 'utf8');
    const res2 = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(res2.status, 0, `Fallo en actualización de ficha: ${res2.stderr}`);

    // Debe haberse actualizado site.json con el nuevo nombre, pero preservado el componente congelado
    const updatedSiteJson = JSON.parse(readFileSync(siteJsonPath, 'utf8'));
    assert.equal(updatedSiteJson.content.prestador.nombre, 'Lic. Prueba Actualizada');
    assert.equal(updatedSiteJson.template_version, 'nutricionista@0.9.0');
    const footerAfterContentEdit = readFileSync(footerComponentPath, 'utf8');
    assert.ok(
      footerAfterContentEdit.includes(frozenMarker),
      'El código del template del prestador NO debe sobrescribirse si no se pidió --upgrade-template ni cambió template_version'
    );

    // Paso 3: Ejecutar con --upgrade-template explícito -> actualiza la ficha a la última versión (nutricionista@1.0.0) y reclona
    const res3 = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--upgrade-template', '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(res3.status, 0, `Fallo en --upgrade-template: ${res3.stderr}`);
    const lockAfterUpgrade = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(lockAfterUpgrade.template_version, 'nutricionista@1.0.0');
    assert.match(readFileSync(fichePath, 'utf8'), /template_version:\s*"nutricionista@1\.0\.0"/);
    assert.ok(
      !readFileSync(footerComponentPath, 'utf8').includes(frozenMarker),
      'Con --upgrade-template debe actualizarse el código del template desde /templates/{rubro}'
    );
  } finally {
    cleanup();
  }
});

test('T-VER-03 - auditHtmlDocument: web/ exige 0 JS estricto y sites/ acepta JS propio dentro de presupuesto y rechaza terceros no declarados', () => {
  const baseValidHtml = (extraHead = '') => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script type="application/ld+json">{"@context":"https://schema.org"}</script>
  ${extraHead}
</head>
<body>
  <h1>Consultoría Nutricional</h1>
  <img src="/hero.jpg" alt="Foto profesional" />
  <a href="https://wa.me/5491155551111">Agendar por WhatsApp</a>
</body>
</html>`;

  // 1. En web/, 0 JS pasa y cualquier <script> ejecutable falla
  const webClean = auditHtmlDocument(baseValidHtml(), { mode: 'web', requireWhatsappCta: false });
  assert.equal(webClean.ok, true);
  assert.equal(webClean.jsBytes, 0);

  const webWithJs = auditHtmlDocument(
    baseValidHtml('<script>console.log("anim");</script>'),
    { mode: 'web', requireWhatsappCta: false }
  );
  assert.equal(webWithJs.ok, false);
  assert.match(webWithJs.errors[0], /0 JS estricto/);

  // 2. En sites/ (PREMIUM), JS propio dentro del presupuesto pasa y reporta peso
  const siteWithInlineJs = auditHtmlDocument(
    baseValidHtml('<script>document.documentElement.classList.add("ready");</script>'),
    { mode: 'site', maxJsBudgetBytes: DEFAULT_SITE_JS_BUDGET_BYTES }
  );
  assert.equal(siteWithInlineJs.ok, true);
  assert.ok(siteWithInlineJs.jsBytes > 0);
  assert.ok(siteWithInlineJs.jsBytes <= DEFAULT_SITE_JS_BUDGET_BYTES);

  // 3. En sites/, exceder el presupuesto JS falla
  const siteOverBudget = auditHtmlDocument(
    baseValidHtml(`<script>${'x'.repeat(512)}</script>`),
    { mode: 'site', maxJsBudgetBytes: 100 }
  );
  assert.equal(siteOverBudget.ok, false);
  assert.match(siteOverBudget.errors[0], /Presupuesto de JS propio excedido/);

  // 4. En sites/, un script externo de terceros no declarado falla
  const siteExternalScript = auditHtmlDocument(
    baseValidHtml('<script src="https://cdn.tracker-externo.com/sdk.js"></script>'),
    { mode: 'site' }
  );
  assert.equal(siteExternalScript.ok, false);
  assert.match(siteExternalScript.errors[0], /scripts externos de terceros/);
});
