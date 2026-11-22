import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildZohoOutreachEmail,
  sendZohoOutreachEmail,
} from '../scripts/send-zoho-outreach.mjs';
import { runIntakeMapsBatch } from '../scripts/intake-maps-batch.mjs';
import { createInMemoryLeadStore } from '../scripts/sheets-sync.mjs';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SPAM_TRIGGERS = [
  'GRATIS!!!',
  'GANÁ DINERO',
  'COMPRA YA',
  '100% GRATIS',
  'CLICK AQUÍ',
  'OFERTA IMPERDIBLE',
];

function createMockSupabase(initialLeads = []) {
  const store = new Map(initialLeads.map((l) => [l.slug, structuredClone(l)]));
  const updates = [];

  return {
    updates,
    getBySlug(slug) {
      return store.get(slug);
    },
    from(table) {
      assert.equal(table, 'leads');
      return {
        update(patch) {
          return {
            eq(col, val) {
              if (col === 'slug' && store.has(val)) {
                const current = store.get(val);
                const next = { ...current, ...patch };
                store.set(val, next);
                updates.push({ col, val, patch });
                return Promise.resolve({ data: [next], error: null });
              }
              if (col === 'id') {
                for (const [slugKey, row] of store.entries()) {
                  if (row.id === val) {
                    const next = { ...row, ...patch };
                    store.set(slugKey, next);
                    updates.push({ col, val, patch });
                    return Promise.resolve({ data: [next], error: null });
                  }
                }
              }
              return Promise.resolve({ data: [], error: null });
            },
          };
        },
      };
    },
  };
}

describe('T52-Seam1: Zoho Mail Outbound (buildZohoOutreachEmail & sendZohoOutreachEmail)', () => {
  test('Z52.1: buildZohoOutreachEmail genera asunto, HTML y texto plano en voseo argentino sin spam triggers con diagnóstico Maps, preview, anclaje y WA oficial', () => {
    const leadCubetaB = {
      id: 24,
      slug: '24-centro-odontologico-odonto',
      nombre: 'Centro Odontológico Palermo',
      rubro: 'odontologo',
      ciudad: 'Palermo',
      email: 'turnos@centropalermo.com.ar',
      rating: 4.8,
      reviews_count: 52,
      website_bucket: 'cubeta_b',
      website_url: 'http://centropalermo.com.ar',
      website_audit: {
        has_https: false,
        has_mobile_viewport: false,
        signals: ['no_https', 'missing_mobile_viewport', 'missing_whatsapp_or_booking_cta'],
      },
    };

    const email = buildZohoOutreachEmail(leadCubetaB);

    assert.equal(email.to, 'turnos@centropalermo.com.ar');
    assert.ok(email.subject && email.subject.length > 10 && email.subject.length < 110);
    assert.ok(email.html.includes('https://preview.nexobow.site/24-centro-odontologico-odonto/'));
    assert.ok(email.text.includes('https://preview.nexobow.site/24-centro-odontologico-odonto/'));

    // Diagnóstico real de Google Maps y Cubeta B
    assert.match(email.html, /4\.8/);
    assert.match(email.html, /52/);
    assert.match(email.html, /Cubeta B|web actual|HTTPS|WhatsApp|móvil/i);
    assert.match(email.text, /4\.8/);
    assert.match(email.text, /52/);

    // Voseo argentino + anclaje Hormozi + reserva 7 días + WhatsApp Juanma
    assert.match(email.text, /armé|tenés|podés|miralo|respondeme/i);
    assert.ok(
      email.html.includes('con solo recuperar 2 consultas por mes que hoy se pierden sin respuesta, el sistema ya se paga solo'),
      'El cuerpo HTML debe incluir el anclaje de valor exacto'
    );
    assert.ok(
      email.text.includes('con solo recuperar 2 consultas por mes que hoy se pierden sin respuesta, el sistema ya se paga solo'),
      'El cuerpo texto plano debe incluir el anclaje de valor exacto'
    );
    assert.match(email.html, /7 días/);
    assert.match(email.html, /5493489536088/);
    assert.match(email.text, /5493489536088/);

    // Sin palabras gatillo de spam
    const combinedUpper = `${email.subject}\n${email.html}\n${email.text}`.toUpperCase();
    for (const trigger of SPAM_TRIGGERS) {
      assert.equal(
        combinedUpper.includes(trigger),
        false,
        `El correo no debe contener spam trigger: ${trigger}`
      );
    }

    // Diagnóstico Cubeta A
    const leadCubetaA = {
      id: 25,
      slug: '25-dra-camila-paz-estetica',
      nombre: 'Dra. Camila Paz',
      rubro: 'estetica',
      email: 'contacto@drapaz.com.ar',
      rating: 4.9,
      reviews_count: 19,
      website_bucket: 'cubeta_a',
      website_url: 'https://instagram.com/drapaz',
    };
    const emailA = buildZohoOutreachEmail(leadCubetaA);
    assert.match(emailA.html, /Cubeta A|sin web propia|solo redes|Instagram/i);
    assert.ok(emailA.html.includes('https://preview.nexobow.site/25-dra-camila-paz-estetica/'));
  });

  test('Z52.2: sendZohoOutreachEmail hace skip limpio (skipped_no_email) sin invocar SMTP si no hay email válido', async () => {
    let sendCalls = 0;
    const mockTransport = {
      async sendMail() {
        sendCalls++;
        return { messageId: '<unexpected@zoho.com>' };
      },
    };
    const supabaseMock = createMockSupabase([
      { id: 30, slug: '30-sin-email-nutri', name: 'Lic. Sin Email', metadata: {} },
    ]);

    const res = await sendZohoOutreachEmail(
      {
        id: 30,
        slug: '30-sin-email-nutri',
        nombre: 'Lic. Sin Email',
        email: null,
        rating: 4.7,
        reviews_count: 12,
        website_bucket: 'cubeta_a',
      },
      { transport: mockTransport, supabaseClient: supabaseMock }
    );

    assert.equal(sendCalls, 0);
    assert.equal(res.status, 'skipped_no_email');
    assert.equal(res.skipped, true);
    assert.equal(res.emailOutreach.status, 'skipped_no_email');
    assert.equal(res.emailOutreach.provider, 'zoho_mail');
    assert.equal(res.emailOutreach.sent_at, null);
    assert.equal(res.emailOutreach.message_id, null);

    const updated = supabaseMock.getBySlug('30-sin-email-nutri');
    assert.equal(updated.metadata.email_outreach.status, 'skipped_no_email');
  });

  test('Z52.3: sendZohoOutreachEmail previene reenvíos duplicados cuando email_outreach.status === "sent" salvo --force', async () => {
    let sendCalls = 0;
    const mockTransport = {
      async sendMail() {
        sendCalls++;
        return { messageId: `<zoho-msg-${sendCalls}@nexobow.site>` };
      },
    };

    const alreadySentLead = {
      id: 24,
      slug: '24-centro-odontologico-odonto',
      nombre: 'Centro Odontológico Palermo',
      email: 'turnos@centropalermo.com.ar',
      rating: 4.8,
      reviews_count: 52,
      website_bucket: 'cubeta_b',
      metadata: {
        email_outreach: {
          status: 'sent',
          provider: 'zoho_mail',
          sent_at: '2026-11-17T10:00:00.000Z',
          message_id: '<prev@nexobow.site>',
        },
      },
    };

    // Sin --force: bloquea duplicado
    const dupRes = await sendZohoOutreachEmail(alreadySentLead, {
      transport: mockTransport,
    });
    assert.equal(sendCalls, 0);
    assert.equal(dupRes.duplicate, true);
    assert.equal(dupRes.skipped, true);
    assert.equal(dupRes.status, 'sent');
    assert.equal(dupRes.emailOutreach.message_id, '<prev@nexobow.site>');

    // Con --force (force: true): reenvía y actualiza trazabilidad
    const forcedRes = await sendZohoOutreachEmail(alreadySentLead, {
      transport: mockTransport,
      force: true,
    });
    assert.equal(sendCalls, 1);
    assert.equal(forcedRes.duplicate, false);
    assert.equal(forcedRes.status, 'sent');
    assert.equal(forcedRes.emailOutreach.message_id, '<zoho-msg-1@nexobow.site>');
  });

  test('Z52.4: sendZohoOutreachEmail soporta --dry-run, registra sent en Supabase mock y captura errores SMTP como status "error"', async () => {
    let sendCalls = 0;
    const sentPayloads = [];
    const mockTransport = {
      async sendMail(mail) {
        sendCalls++;
        sentPayloads.push(mail);
        return { messageId: '<msg-ok-24@nexobow.site>' };
      },
    };

    const lead = {
      id: 24,
      slug: '24-centro-odontologico-odonto',
      nombre: 'Centro Odontológico Palermo',
      email: 'turnos@centropalermo.com.ar',
      rating: 4.8,
      reviews_count: 52,
      website_bucket: 'cubeta_b',
      metadata: {},
    };

    // 1. Dry-run: no invoca SMTP ni muta DB real, devuelve status dry_run
    const dryRes = await sendZohoOutreachEmail(lead, {
      dryRun: true,
      transport: mockTransport,
    });
    assert.equal(sendCalls, 0);
    assert.equal(dryRes.status, 'dry_run');
    assert.equal(dryRes.emailOutreach.status, 'dry_run');
    assert.equal(dryRes.emailOutreach.provider, 'zoho_mail');
    assert.equal(dryRes.lead.metadata.email_outreach.status, 'dry_run');

    // 2. Envío real contra transporte mock + persistencia en Supabase mock
    const supabaseMock = createMockSupabase([lead]);
    const sentRes = await sendZohoOutreachEmail(lead, {
      transport: mockTransport,
      supabaseClient: supabaseMock,
      now: () => new Date('2026-11-17T18:30:00.000Z'),
    });

    assert.equal(sendCalls, 1);
    assert.equal(sentPayloads[0].to, 'turnos@centropalermo.com.ar');
    assert.equal(sentRes.status, 'sent');
    assert.equal(sentRes.emailOutreach.sent_at, '2026-11-17T18:30:00.000Z');
    assert.equal(sentRes.emailOutreach.message_id, '<msg-ok-24@nexobow.site>');
    assert.equal(sentRes.emailOutreach.error, null);

    const persisted = supabaseMock.getBySlug('24-centro-odontologico-odonto');
    assert.equal(persisted.metadata.email_outreach.status, 'sent');
    assert.equal(persisted.metadata.email_outreach.message_id, '<msg-ok-24@nexobow.site>');

    // 3. Error de transporte SMTP -> captura limpia y registra status "error"
    const failingTransport = {
      async sendMail() {
        throw new Error('535 Authentication Failed');
      },
    };
    const errRes = await sendZohoOutreachEmail(lead, {
      transport: failingTransport,
      supabaseClient: supabaseMock,
      force: true,
    });
    assert.equal(errRes.ok, false);
    assert.equal(errRes.status, 'error');
    assert.match(errRes.emailOutreach.error, /535 Authentication Failed/);
    assert.equal(
      supabaseMock.getBySlug('24-centro-odontologico-odonto').metadata.email_outreach.status,
      'error'
    );
  });

  test('Z52.5: hook opcional de Zoho en runIntakeMapsBatch envía solo a leads con email y preserva metadata Gate 0 en Supabase', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'nexobow-zoho-intake-'));
    mkdirSync(join(tmpRoot, 'clients'), { recursive: true });
    mkdirSync(join(tmpRoot, 'assets'), { recursive: true });

    try {
      const store = createInMemoryLeadStore({ initialRows: [] });
      const rowsBySlug = new Map();
      const mockSupabase = {
        from(table) {
          assert.equal(table, 'leads');
          return {
            async upsert(records) {
              for (const r of records) rowsBySlug.set(r.slug, structuredClone(r));
              return { data: records, error: null };
            },
            update(patch) {
              return {
                eq(col, val) {
                  if (col === 'slug' && rowsBySlug.has(val)) {
                    rowsBySlug.set(val, { ...rowsBySlug.get(val), ...patch });
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
          };
        },
      };

      const sentMails = [];
      const mockTransport = {
        async sendMail(mail) {
          sentMails.push(mail);
          return { messageId: `<batch-${sentMails.length}@nexobow.site>` };
        },
      };

      const res = await runIntakeMapsBatch({
        links: ['https://www.google.com/maps/place/Odonto+Test/@-34.59,-58.40,17z/?cid=777'],
        noDeploy: true,
        skipBuild: true,
        outputRoot: tmpRoot,
        leadStore: store,
        supabaseClient: mockSupabase,
        sendZoho: true,
        zohoTransport: mockTransport,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          url: 'http://odontotest.com.ar',
          text: async () => '<a href="mailto:hola@odontotest.com.ar">Mail</a>',
        }),
        placeResolver: async () => ({
          placeId: 'p777',
          nombre: 'Odonto Test',
          rubro: 'odontologo',
          direccion: 'Av. Callao 500, CABA',
          telefono: '+5491155557777',
          websiteUri: 'http://odontotest.com.ar',
          rating: 4.9,
          userRatingCount: 40,
          reviews: [],
        }),
      });

      assert.equal(res.processedCount, 1);
      assert.equal(sentMails.length, 1);
      assert.equal(sentMails[0].to, 'hola@odontotest.com.ar');
      assert.equal(res.leads[0].emailOutreach.status, 'sent');

      const stored = rowsBySlug.get(res.leads[0].slug);
      assert.equal(stored.metadata.website_bucket, 'cubeta_b');
      assert.equal(stored.metadata.email_outreach.status, 'sent');
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
