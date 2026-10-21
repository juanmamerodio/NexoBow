// tests/template-versioning.test.mjs — Verifica inmutabilidad de template_version y aislamiento de clones
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  resolveTemplateVersion,
  shouldRecloneTemplate
} from '../scripts/build-client-site.mjs';

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

test('T-VER-02 - build-client-site respeta template_version, preserva el clon ante ediciones de contenido y actualiza solo con --upgrade-template o cambio de versión', () => {
  const slug = '99-test-versioning-nutri';
  const fichePath = join(REPO_ROOT, 'clients', `${slug}.md`);
  const siteDir = join(REPO_ROOT, 'sites', slug);
  const lockPath = join(siteDir, '.template-lock.json');
  const footerComponentPath = join(siteDir, 'src', 'components', 'Footer.astro');
  const siteJsonPath = join(siteDir, 'src', 'site.json');

  const cleanup = () => {
    if (existsSync(fichePath)) rmSync(fichePath, { force: true });
    if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });
  };
  cleanup();

  try {
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
subdominio: "preview.nexobow.site/${slug}"
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

    // Paso 1: Creación inicial del sitio
    writeFileSync(fichePath, baseFiche('Lic. Prueba Inicial', 'nutricionista@1.0.0'), 'utf8');
    const res1 = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(res1.status, 0, `Fallo en clon inicial: ${res1.stderr}`);
    assert.ok(existsSync(lockPath), 'Debe crearse .template-lock.json en sites/{slug}');
    const lock1 = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(lock1.template_version, 'nutricionista@1.0.0');

    // Simular que el clon del prestador tiene su versión congelada de Footer.astro
    const frozenMarker = '<!-- FROZEN_CLIENT_TEMPLATE_V1_0_0 -->';
    const originalFooter = readFileSync(footerComponentPath, 'utf8');
    writeFileSync(footerComponentPath, `${originalFooter}\n${frozenMarker}\n`, 'utf8');

    // Paso 2: Re-ejecutar build-client-site tras editar datos de la ficha SIN --upgrade-template
    writeFileSync(fichePath, baseFiche('Lic. Prueba Actualizada', 'nutricionista@1.0.0'), 'utf8');
    const res2 = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(res2.status, 0, `Fallo en actualización de ficha: ${res2.stderr}`);

    // Debe haberse actualizado site.json con el nuevo nombre, pero preservado el componente congelado
    const updatedSiteJson = JSON.parse(readFileSync(siteJsonPath, 'utf8'));
    assert.equal(updatedSiteJson.content.prestador.nombre, 'Lic. Prueba Actualizada');
    assert.equal(updatedSiteJson.template_version, 'nutricionista@1.0.0');
    const footerAfterContentEdit = readFileSync(footerComponentPath, 'utf8');
    assert.ok(
      footerAfterContentEdit.includes(frozenMarker),
      'El código del template del prestador NO debe sobrescribirse si no se pidió --upgrade-template ni cambió template_version'
    );

    // Paso 3: Cambiar explícitamente template_version en la ficha .md -> debe reclonar y actualizar lock
    writeFileSync(fichePath, baseFiche('Lic. Prueba Actualizada', 'nutricionista@1.1.0'), 'utf8');
    const res3 = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(res3.status, 0, `Fallo al cambiar template_version en ficha: ${res3.stderr}`);
    const lockAfterVersionChange = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(lockAfterVersionChange.template_version, 'nutricionista@1.1.0');
    assert.ok(
      !readFileSync(footerComponentPath, 'utf8').includes(frozenMarker),
      'Al cambiar template_version en la ficha debe reclonar desde el template'
    );

    // Paso 4: Ejecutar con --upgrade-template explícito -> debe actualizar al template actual (1.0.0)
    writeFileSync(footerComponentPath, `${originalFooter}\n${frozenMarker}\n`, 'utf8');
    const res4 = spawnSync(
      'node',
      ['scripts/build-client-site.mjs', `clients/${slug}.md`, '--upgrade-template', '--skip-build'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(res4.status, 0, `Fallo en --upgrade-template: ${res4.stderr}`);
    const footerAfterUpgrade = readFileSync(footerComponentPath, 'utf8');
    assert.ok(
      !footerAfterUpgrade.includes(frozenMarker),
      'Con --upgrade-template debe actualizarse el código del template desde /templates/{rubro}'
    );
  } finally {
    cleanup();
  }
});
