import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDnsInstructions,
  verifyDomainDns,
  provisionDomainCommand
} from '../scripts/domain-provisioner.mjs';

describe('T36: domain-provisioner - Handoff Post-Venta Cloudflare & DNS', () => {
  test('T36.1: generateDnsInstructions detecta NIC Argentina (.com.ar) y entrega instrucciones específicas', () => {
    const res = generateDnsInstructions({
      domain: 'dramartinez.com.ar',
      slug: '22-alejandra-martinez-nutri'
    });

    assert.equal(res.domain, 'dramartinez.com.ar');
    assert.equal(res.isNicAr, true);
    assert.ok(res.instructions.includes('NIC Argentina'));
    assert.ok(res.instructions.includes('nexobow-previews.pages.dev'));
    assert.deepEqual(res.dnsRecords, [
      { type: 'CNAME', name: 'www', target: 'nexobow-previews.pages.dev' },
      { type: 'CNAME', name: '@', target: 'nexobow-previews.pages.dev' }
    ]);
  });

  test('T36.2: generateDnsInstructions maneja dominios internacionales (.com) con CNAME estándar', () => {
    const res = generateDnsInstructions({
      domain: 'estudioalbarracin.com',
      slug: '20-martin-albarracin-abogado'
    });

    assert.equal(res.domain, 'estudioalbarracin.com');
    assert.equal(res.isNicAr, false);
    assert.ok(res.instructions.includes('Cloudflare Registrar') || res.instructions.includes('tu registrador'));
    assert.deepEqual(res.dnsRecords[0], { type: 'CNAME', name: 'www', target: 'nexobow-previews.pages.dev' });
  });

  test('T36.3: provisionDomainCommand genera el comando exacto de Wrangler Pages', () => {
    const cmd = provisionDomainCommand({
      domain: 'dramartinez.com.ar',
      projectId: 'nexobow-previews'
    });
    assert.equal(cmd, 'npx wrangler pages project domain add nexobow-previews --domain dramartinez.com.ar');
  });

  test('T36.4: verifyDomainDns valida resolución CNAME con resolver inyectable', async () => {
    // Mock resolver exitoso
    const mockSuccessResolver = {
      resolveCname: async (host) => ['nexobow-previews.pages.dev']
    };

    const successRes = await verifyDomainDns({
      domain: 'www.dramartinez.com.ar',
      resolver: mockSuccessResolver
    });

    assert.equal(successRes.verified, true);
    assert.equal(successRes.domain, 'www.dramartinez.com.ar');
    assert.equal(successRes.pointsToTarget, true);

    // Mock resolver fallido (apunta a host incorrecto)
    const mockFailResolver = {
      resolveCname: async (host) => ['otro-hosting.com']
    };

    const failRes = await verifyDomainDns({
      domain: 'www.estudioalbarracin.com',
      resolver: mockFailResolver
    });

    assert.equal(failRes.verified, false);
    assert.equal(failRes.pointsToTarget, false);
  });
});
