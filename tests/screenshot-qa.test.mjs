import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  VIEWPORTS,
  validateViewportMetrics,
  getScreenshotPaths,
  auditVisualLanding
} from '../scripts/screenshot-qa.mjs';

describe('T35: screenshot-qa - Auditoría Visual Dual-Viewport', () => {
  test('T35.1: VIEWPORTS define los estándares móvil (375x812) y desktop (1440x900)', () => {
    assert.deepEqual(VIEWPORTS.mobile, { width: 375, height: 812 });
    assert.deepEqual(VIEWPORTS.desktop, { width: 1440, height: 900 });
  });

  test('T35.2: validateViewportMetrics detecta desborde horizontal (overflow-x)', () => {
    // Caso limpio (scrollWidth == innerWidth)
    const clean = validateViewportMetrics({
      scrollWidth: 375,
      innerWidth: 375,
      scrollHeight: 1200,
      innerHeight: 812
    });
    assert.equal(clean.hasHorizontalOverflow, false);
    assert.equal(clean.overflowPixels, 0);
    assert.equal(clean.isClean, true);

    // Caso con desborde (scrollWidth > innerWidth por 45px)
    const broken = validateViewportMetrics({
      scrollWidth: 420,
      innerWidth: 375,
      scrollHeight: 1200,
      innerHeight: 812
    });
    assert.equal(broken.hasHorizontalOverflow, true);
    assert.equal(broken.overflowPixels, 45);
    assert.equal(broken.isClean, false);
  });

  test('T35.3: getScreenshotPaths genera rutas deterministas en .reports/screenshots/{slug}/', () => {
    const paths = getScreenshotPaths({ slug: '10-sofia-nutri' });
    assert.ok(paths.dir.endsWith('.reports/screenshots/10-sofia-nutri'));
    assert.ok(paths.mobile.endsWith('mobile.png'));
    assert.ok(paths.desktop.endsWith('desktop.png'));
  });

  test('T35.4: auditVisualLanding orquesta la auditoría con runner inyectable', async () => {
    // Mock runner para simular Playwright sin dependencias de red ni binarios
    const mockRunner = {
      audit: async ({ viewport, url }) => {
        return {
          viewportName: viewport.width === 375 ? 'mobile' : 'desktop',
          metrics: {
            scrollWidth: viewport.width,
            innerWidth: viewport.width,
            scrollHeight: 1500,
            innerHeight: viewport.height
          },
          screenshotSaved: true
        };
      }
    };

    const result = await auditVisualLanding({
      slug: '10-sofia-nutri',
      url: 'https://preview.nexobow.site/10-sofia-nutri/',
      runner: mockRunner
    });

    assert.equal(result.slug, '10-sofia-nutri');
    assert.equal(result.passed, true);
    assert.equal(result.viewports.mobile.isClean, true);
    assert.equal(result.viewports.desktop.isClean, true);
  });
});
