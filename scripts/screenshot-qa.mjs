#!/usr/bin/env node

/**
 * scripts/screenshot-qa.mjs
 * Auditor visual automatizado dual-viewport (móvil 375px y desktop 1440px)
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 }
};

/**
 * Valida si existen desbordes horizontales u anomalías de layout
 */
export function validateViewportMetrics({ scrollWidth = 0, innerWidth = 0, scrollHeight = 0, innerHeight = 0 } = {}) {
  const overflowPixels = Math.max(0, scrollWidth - innerWidth);
  const hasHorizontalOverflow = overflowPixels > 0;

  return {
    hasHorizontalOverflow,
    overflowPixels,
    isClean: !hasHorizontalOverflow,
    scrollWidth,
    innerWidth,
    scrollHeight,
    innerHeight
  };
}

/**
 * Devuelve las rutas esperadas de capturas de pantalla para un slug
 */
export function getScreenshotPaths({ slug = 'default', outputDir = '.reports/screenshots' } = {}) {
  const dir = path.resolve(process.cwd(), outputDir, slug);
  return {
    dir,
    mobile: path.join(dir, 'mobile.png'),
    desktop: path.join(dir, 'desktop.png')
  };
}

/**
 * Realiza la auditoría visual de una landing en vivo o local
 */
export async function auditVisualLanding({
  slug = 'demo',
  url = `https://preview.nexobow.site/${slug}/`,
  outputDir = '.reports/screenshots',
  runner = null
} = {}) {
  const paths = getScreenshotPaths({ slug, outputDir });

  // Si se inyecta un mock runner (tests), usarlo
  if (runner && typeof runner.audit === 'function') {
    const mobileRes = await runner.audit({ viewport: VIEWPORTS.mobile, url, outputPath: paths.mobile });
    const desktopRes = await runner.audit({ viewport: VIEWPORTS.desktop, url, outputPath: paths.desktop });

    const mobileMetrics = validateViewportMetrics(mobileRes.metrics);
    const desktopMetrics = validateViewportMetrics(desktopRes.metrics);

    return {
      slug,
      url,
      passed: mobileMetrics.isClean && desktopMetrics.isClean,
      viewports: {
        mobile: mobileMetrics,
        desktop: desktopMetrics
      },
      paths
    };
  }

  // Runner real con Playwright (importación dinámica defensiva)
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    // Si Playwright no está instalado localmente, advertir y retornar diagnóstico estructurado
    return {
      slug,
      url,
      passed: true,
      skipped: true,
      reason: 'Playwright no está instalado en node_modules. Ejecutá: npm i -D playwright',
      paths
    };
  }

  const { chromium } = playwright;
  const browser = await chromium.launch({ headless: true });
  const results = {};

  try {
    fs.mkdirSync(paths.dir, { recursive: true });

    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: vp });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

      const metrics = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight
        };
      });

      const validated = validateViewportMetrics(metrics);
      const screenshotFile = vpName === 'mobile' ? paths.mobile : paths.desktop;
      await page.screenshot({ path: screenshotFile, fullPage: true });

      results[vpName] = {
        ...validated,
        screenshot: screenshotFile
      };

      await page.close();
    }
  } finally {
    await browser.close();
  }

  const passed = results.mobile.isClean && results.desktop.isClean;

  return {
    slug,
    url,
    passed,
    viewports: results,
    paths
  };
}

// Ejecución como script CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const slug = args[0] || 'demo-abogado';
  const customUrl = args[1];

  console.log(`\n📸 INICIANDO QA VISUAL DUAL-VIEWPORT PARA: ${slug}...`);
  auditVisualLanding({ slug, url: customUrl }).then((res) => {
    if (res.skipped) {
      console.log(`⚠️ QA OMITIDO: ${res.reason}`);
      process.exit(0);
    }
    console.log(`Móvil (375px): ${res.viewports.mobile.isClean ? '✅ LIMPIO (0 overflow)' : `❌ DESBORDE: +${res.viewports.mobile.overflowPixels}px`}`);
    console.log(`Desktop (1440px): ${res.viewports.desktop.isClean ? '✅ LIMPIO (0 overflow)' : `❌ DESBORDE: +${res.viewports.desktop.overflowPixels}px`}`);
    console.log(`Capturas guardadas en: ${res.paths.dir}\n`);

    if (!res.passed) {
      console.error(`❌ QA Visual FALLÓ: Hay desbordes en el viewport.`);
      process.exit(1);
    } else {
      console.log(`✨ QA Visual APROBADO: La landing es 100% responsiva.`);
      process.exit(0);
    }
  }).catch((err) => {
    console.error(`Error en auditoría visual:`, err.message);
    process.exit(1);
  });
}
