#!/usr/bin/env node
/**
 * scripts/prospect-in-conversation.mjs
 * Orquestador ligero de prospección in-conversation con Google Sheets y Places API.
 * Uso: node scripts/prospect-in-conversation.mjs --query "abogados en Campana" [--nicho "Abogacía"] [--limit 10] [--mock]
 */

import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultLeadStore,
  filterEligiblePlaces,
  formatLeadToSheetRow,
  buildCorrelativeSlug,
  mapSheetRowToLeadEntity,
  normalizePhone,
  DEFAULT_SPREADSHEET_ID
} from './sheets-sync.mjs';

export function resolveRubroFromLead(nichoOrQuery = '') {
  const clean = String(nichoOrQuery || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (clean.includes('psic')) return 'psicologo';
  if (clean.includes('abog') || clean.includes('jurid') || clean.includes('legal')) return 'abogado';
  if (clean.includes('odont') || clean.includes('dent')) return 'odontologo';
  if (clean.includes('kines') || clean.includes('fisio')) return 'kinesiologo';
  if (clean.includes('cirug') || clean.includes('plast')) return 'cirugia';
  if (clean.includes('derma')) return 'dermatologia';
  if (clean.includes('estet')) return 'estetica';
  if (clean.includes('clin') || clean.includes('medic')) return 'clinica';
  if (clean.includes('nutri')) return 'nutricionista';
  const slugified = clean.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return slugified && slugified !== 'servicios-profesionales' ? slugified : 'nutricionista';
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Cargar variables de entorno si existe .env
try {
  if (existsSync(join(REPO_ROOT, '.env'))) {
    process.loadEnvFile(join(REPO_ROOT, '.env'));
  }
} catch {
  // Ignorar si no se puede cargar automáticamente
}

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

export function formatArgentinePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('549')) return `+${digits}`;
  if (digits.startsWith('54')) return `+549${digits.slice(2)}`;
  digits = digits.replace(/^0+/, '');
  if (digits.startsWith('11')) {
    let local = digits.slice(2).replace(/^15/, '');
    return `+54911${local}`;
  }
  if ((digits.startsWith('3489') || digits.startsWith('3487') || digits.startsWith('348')) && digits.length >= 8) {
    let area = digits.slice(0, 4);
    let local = digits.slice(4).replace(/^15/, '');
    return `+549${area}${local}`;
  }
  digits = digits.replace(/^15/, '');
  return `+549${digits}`;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function cleanDisplayName(title = '') {
  return String(title || '')
    .replace(/^Lic\.\s+[Ee]n\s+[Nn]utrici[oó]n\s+/i, 'Lic. ')
    .replace(/^Licenciada\s+[Ee]n\s+[Nn]utrici[oó]n\s+/i, 'Lic. ')
    .replace(/^Licenciado\s+[Ee]n\s+[Nn]utrici[oó]n\s+/i, 'Lic. ')
    .trim();
}

export async function searchSerperPlaces(query, apiKey, limit = 20) {
  const url = 'https://google.serper.dev/places';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({
      q: query,
      gl: 'ar',
      hl: 'es',
      num: limit
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Serper API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.places || []).map(p => ({
    displayName: cleanDisplayName(p.title || ''),
    formattedAddress: p.address || '',
    nationalPhoneNumber: formatArgentinePhoneNumber(p.phoneNumber || ''),
    websiteUri: p.website || '',
    rating: p.rating || 5.0,
    userRatingCount: p.ratingCount || 0
  }));
}

export async function searchMultiplePlaces(query, serperKey, googleKey, limit = 20) {
  if (serperKey) {
    return await searchSerperPlaces(query, serperKey, limit);
  }
  if (!googleKey) {
    throw new Error('No se encontró SERPER_API_KEY ni GOOGLE_MAPS_API_KEY');
  }
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.rating',
    'places.userRatingCount',
    'places.location'
  ].join(',');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleKey,
      'X-Goog-FieldMask': fieldMask
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'es',
      pageSize: limit
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Places API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.places || []).map(p => ({
    displayName: cleanDisplayName(p.displayName?.text || ''),
    formattedAddress: p.formattedAddress || '',
    nationalPhoneNumber: formatArgentinePhoneNumber(p.internationalPhoneNumber || p.nationalPhoneNumber || ''),
    websiteUri: p.websiteUri || '',
    rating: p.rating || 5.0,
    userRatingCount: p.userRatingCount || 0
  }));
}

function getMockPlaces(query, nicho) {
  return [
    {
      displayName: `Estudio Jurídico ${query.split(' ')[0] || 'Campana'}`,
      formattedAddress: 'San Martín 240, Campana, Buenos Aires',
      nationalPhoneNumber: '+54 9 3489 55-1234',
      websiteUri: '', // sin web -> elegible
      rating: 4.8,
      userRatingCount: 19
    },
    {
      displayName: 'Dra. Silvina Rodríguez - Asuntos Civiles y Laborales',
      formattedAddress: 'Belgrano 450, Campana, Buenos Aires',
      nationalPhoneNumber: '+54 9 3489 66-5678',
      websiteUri: 'https://instagram.com/silvina.abogada', // instagram -> elegible
      rating: 4.9,
      userRatingCount: 24
    },
    {
      displayName: 'Estudio Integral con Web Corporativa',
      formattedAddress: 'Rivadavia 120, Campana, Buenos Aires',
      nationalPhoneNumber: '+54 9 3489 77-9900',
      websiteUri: 'https://estudiocorporativo.com.ar', // web propia -> descartado por filtro
      rating: 4.7,
      userRatingCount: 31
    }
  ];
}

async function main() {
  const flags = parseArgs();
  const query = flags.query || flags.q;
  const nicho = flags.nicho || 'Servicios Profesionales';
  const limit = parseInt(flags.limit || '10', 10);
  const isMock = Boolean(flags.mock);
  const dryRun = Boolean(flags['dry-run']);

  if (!query && !isMock) {
    console.error(`[ERROR] Especificá una consulta con --query. Ejemplo: --query "abogados en Campana"`);
    process.exit(1);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  console.log(`\n\x1b[36m⚡ NexoBow Prospección In-Conversation\x1b[0m`);
  console.log(`- Consulta: "${query || 'Mock Query'}"`);
  console.log(`- Nicho: ${nicho}`);
  console.log(`- Límite máximo: ${limit} prospectos`);
  if (serperKey) {
    console.log(`- Fuente de datos: Serper Dev (Google Places Scraper)`);
  } else if (apiKey) {
    console.log(`- Fuente de datos: Google Maps Platform (Places API New)`);
  }

  // 1. Obtener prospectos existentes en Google Sheet + Supabase para deduplicación e ID único
  console.log(`\n1. Verificando prospectos existentes en Google Sheet (${DEFAULT_SPREADSHEET_ID}) y Supabase...`);
  const existingKeys = defaultLeadStore.getExistingKeys();
  let supabaseClient = null;
  let supabaseMaxId = 0;

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!isMock && supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      const { data: sbRows } = await supabaseClient.from('leads').select('id, name, phone');
      if (Array.isArray(sbRows)) {
        for (const r of sbRows) {
          if (r.id > supabaseMaxId) supabaseMaxId = Number(r.id);
          if (r.name) existingKeys.push(String(r.name));
          if (r.phone) existingKeys.push(normalizePhone(r.phone));
        }
      }
    } catch (sbErr) {
      console.warn(`[AVISO] No se pudo consultar Supabase para deduplicación (${sbErr.message}).`);
    }
  }
  console.log(`✓ ${existingKeys.length} claves existentes identificadas para deduplicación.`);

  // 2. Extraer prospectos candidatos
  let candidatePlaces = [];
  if (isMock || (!apiKey && !serperKey)) {
    if (!isMock && !apiKey && !serperKey) {
      console.warn(`[AVISO] No se encontró SERPER_API_KEY ni GOOGLE_MAPS_API_KEY. Usando candidatos de demostración.`);
    }
    candidatePlaces = getMockPlaces(query || 'Campana', nicho);
  } else {
    console.log(`\n2. Consultando API para encontrar profesionales en la zona...`);
    const subQueries = String(query).split(',').map(s => s.trim()).filter(Boolean);
    const collected = [];
    for (const sq of subQueries) {
      console.log(`- Buscando: "${sq}"...`);
      const places = await searchMultiplePlaces(sq, serperKey, apiKey, 20);
      collected.push(...places);
    }
    const seen = new Set();
    for (const p of collected) {
      const key = `${p.displayName.toLowerCase().trim()}|${p.nationalPhoneNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidatePlaces.push(p);
      }
    }
  }

  console.log(`✓ ${candidatePlaces.length} candidatos encontrados en la zona.`);

  const nonRelevantWords = ['omnilife', 'seytu', 'cosme', 'amway', 'herbalife', 'belleza', 'uñas', 'depilacion', 'peluqueria', 'barberia'];
  const filteredCandidates = candidatePlaces.filter(p => {
    const t = (p.displayName || '').toLowerCase();
    if (nonRelevantWords.some(w => t.includes(w))) return false;
    if (!isMock) {
      const digits = String(p.nationalPhoneNumber || '').replace(/\D/g, '');
      if (digits.length < 10) return false;
    }
    return true;
  });

  if (!isMock) {
    // Priorizar celulares argentinos (54911[23567]...) por sobre líneas fijas (549114...) para mayor tasa de WhatsApp activo
    filteredCandidates.sort((a, b) => {
      const isMobile = (p) => /^\+54911[23567]/.test(String(p.nationalPhoneNumber || ''));
      return Number(isMobile(b)) - Number(isMobile(a));
    });
  }

  // 3. Filtrar candidatos (sin web corporativa + sin duplicados + tope limit)
  const eligibleLeads = filterEligiblePlaces(filteredCandidates, existingKeys, limit);

  if (eligibleLeads.length === 0) {
    console.log(`\n\x1b[33m[AVISO] No se encontraron prospectos nuevos sin web en la zona especificada.\x1b[0m`);
    console.log(`Posibles motivos: todos los encontrados ya están cargados o ya disponen de sitio web corporativo propio.`);
    return;
  }

  console.log(`\n3. Prospectos elegibles filtrados (sin web y sin duplicar): ${eligibleLeads.length}`);

  // 4. Formatear e insertar en Google Sheets + Supabase + generar ficha y landing
  const startIndex = Math.max(defaultLeadStore.getNextId(), supabaseMaxId + 1);
  const addedLeads = [];
  const supabaseRecordsToUpsert = [];
  const leadRubro = resolveRubroFromLead(flags.rubro || nicho || query);

  for (let i = 0; i < eligibleLeads.length; i++) {
    const item = eligibleLeads[i];
    let rowId = startIndex + i;
    let itemSlug = buildCorrelativeSlug({
      id: rowId,
      displayName: item.displayName,
      nicho
    });
    let leadFormatted = {
      ...item,
      nicho,
      rubro: leadRubro,
      slug: itemSlug
    };

    let row = formatLeadToSheetRow(leadFormatted, rowId, flags.pitch || null);

    if (dryRun) {
      console.log(`[DRY-RUN] Fila preparada (#${rowId}) para ${leadFormatted.displayName} → ${itemSlug}`);
    } else {
      console.log(`Guardando en Google Sheets (#${rowId}): ${leadFormatted.displayName}...`);
      try {
        const appended = defaultLeadStore.appendLead(leadFormatted, {
          pitchOverride: flags.pitch || null,
          expectedId: rowId
        });
        rowId = appended.id;
        itemSlug = appended.slug;
        row = appended.row;
      } catch (err) {
        console.error(`Error al insertar fila para ${leadFormatted.displayName}: ${err.message}`);
      }

      // Automatización: Generar Ficha Markdown y Compilar Landing
      try {
        console.log(`[prospect] Generando ficha y sitio para ${itemSlug}...`);
        const { spawnSync } = await import('node:child_process');
        const { writeFileSync, mkdirSync } = await import('node:fs');
        const assetDir = join(REPO_ROOT, 'assets', itemSlug);
        mkdirSync(assetDir, { recursive: true });
        const rawPayload = {
          source: 'prospect-in-conversation',
          query,
          slug: itemSlug,
          sheetId: rowId,
          nombre: item.displayName,
          rubro: leadRubro,
          direccion: item.formattedAddress,
          telefono: item.nationalPhoneNumber,
          telefonoFormato: item.nationalPhoneNumber,
          website: item.websiteUri || '',
          rating: item.rating || 5,
          userRatingCount: item.userRatingCount || 0,
          reviews: item.reviews || []
        };
        writeFileSync(join(assetDir, 'lead-raw.json'), JSON.stringify(rawPayload, null, 2), 'utf8');

        const ficheRes = spawnSync('node', ['scripts/generate-client-fiche.mjs', `assets/${itemSlug}/lead-raw.json`], {
          cwd: REPO_ROOT,
          shell: process.platform === 'win32',
          stdio: 'inherit'
        });
        if (ficheRes.status !== 0) {
          throw new Error(`generate-client-fiche falló con código ${ficheRes.status}`);
        }

        const buildRes = spawnSync('node', ['scripts/build-client-site.mjs', `clients/${itemSlug}.md`], {
          cwd: REPO_ROOT,
          shell: process.platform === 'win32',
          stdio: 'inherit'
        });
        if (buildRes.status !== 0) {
          throw new Error(`build-client-site falló con código ${buildRes.status}`);
        }
        console.log(`\x1b[32m[prospect] ✓\x1b[0m Landing compilada para ${itemSlug}`);
      } catch (buildErr) {
        console.warn(`[prospect] Advertencia al generar landing para ${itemSlug}: ${buildErr.message}`);
      }

      const entity = mapSheetRowToLeadEntity(row);
      if (entity && entity.id > 0) {
        entity.slug = itemSlug;
        entity.metadata = {
          ...(entity.metadata || {}),
          rubro: leadRubro,
          source: 'prospect-in-conversation',
          rating: item.rating || 5,
          reviews_count: item.userRatingCount || 0
        };
        supabaseRecordsToUpsert.push(entity);
      }
    }

    addedLeads.push({
      id: rowId,
      slug: itemSlug,
      nombre: leadFormatted.displayName,
      telefono: leadFormatted.nationalPhoneNumber,
      ubicacion: leadFormatted.formattedAddress,
      rating: leadFormatted.rating,
      waLink: row[4],
      demoUrl: row[5]
    });
  }

  if (!dryRun && supabaseClient && supabaseRecordsToUpsert.length > 0) {
    const { error: sbUpsertErr } = await supabaseClient
      .from('leads')
      .upsert(supabaseRecordsToUpsert, { onConflict: 'id' });
    if (sbUpsertErr) {
      console.warn(`[prospect AVISO] Error al sincronizar nuevos leads a Supabase: ${sbUpsertErr.message}`);
    } else {
      console.log(`\x1b[32m[prospect] ✓\x1b[0m ${supabaseRecordsToUpsert.length} leads sincronizados en tiempo real con Supabase (/admin/crm).`);
    }
  }

  // Si no es dry-run y se generaron leads (y no se pasó --no-deploy), desplegar hacia Cloudflare Pages
  if (!dryRun && addedLeads.length > 0 && !flags['no-deploy']) {
    console.log(`\n\x1b[36m[prospect] Desplegando demos actualizadas hacia Cloudflare Pages...\x1b[0m`);
    const { spawnSync } = await import('node:child_process');
    spawnSync('npm', ['run', 'deploy-previews'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
  }

  console.log(`\n\x1b[32m=======================================================`);
  console.log(`✓ ${addedLeads.length} PROSPECTOS AGREGADOS CON ÉXITO AL CRM`);
  console.log(`=======================================================\x1b[0m\n`);

  addedLeads.forEach((l, idx) => {
    console.log(`${idx + 1}. \x1b[1m${l.nombre}\x1b[0m (${l.telefono || 'Sin tel'})`);
    console.log(`   - Preview: ${l.demoUrl}`);
    console.log(`   - Ubicación: ${l.ubicacion}`);
    console.log(`   - WhatsApp Directo: ${l.waLink}`);
  });
}

const { pathToFileURL } = await import('node:url');
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(`[ERROR FATAL] ${err.message}`);
    process.exit(1);
  });
}
