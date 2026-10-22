#!/usr/bin/env node

/**
 * scripts/domain-provisioner.mjs
 * Asistente de aprovisionamiento de dominios propios en Cloudflare Pages
 * Soporta NIC Argentina (.com.ar) y registradores globales (.com)
 */

import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';

export const DEFAULT_TARGET_HOST = 'nexobow-previews.pages.dev';

/**
 * Genera instrucciones paso a paso de DNS adaptadas al tipo de dominio
 */
export function generateDnsInstructions({
  domain = '',
  slug = '',
  targetHost = DEFAULT_TARGET_HOST
} = {}) {
  const cleanDomain = String(domain).trim().toLowerCase();
  const isNicAr = cleanDomain.endsWith('.com.ar') || cleanDomain.endsWith('.ar');

  const dnsRecords = [
    { type: 'CNAME', name: 'www', target: targetHost },
    { type: 'CNAME', name: '@', target: targetHost }
  ];

  let instructions = '';

  if (isNicAr) {
    instructions = `
======================================================
🇦🇷 INSTRUCCIONES DE CONFIGURACIÓN PARA NIC ARGENTINA
Dominio: ${cleanDomain} -> Destino: ${targetHost}
======================================================
1. Ingresá a NIC Argentina (nic.ar) con CUIT y Clave Fiscal.
2. Buscá el dominio "${cleanDomain}" y hacé clic en "Administrar".
3. Opción A (Zona DNS en Cloudflare - Recomendado):
   - Delegá los DNS a los servidores de nombres que te asigne Cloudflare (ej: ana.ns.cloudflare.com).
4. Opción B (Si gestionás DNS en tu hosting / cPanel):
   - Creá un registro CNAME con Nombre "www" apuntando a: ${targetHost}
   - Creá un registro CNAME (o alias ALIAS/ANAME) con Nombre "@" apuntando a: ${targetHost}
5. Una vez guardado, la propagación demora de 2 a 24 horas.
======================================================`;
  } else {
    instructions = `
======================================================
🌐 INSTRUCCIONES DE CONFIGURACIÓN DNS (.COM / INTERNACIONAL)
Dominio: ${cleanDomain} -> Destino: ${targetHost}
======================================================
1. Ingresá a tu registrador (Namecheap, GoDaddy, Google Domains, Cloudflare Registrar).
2. Entrá en la sección "DNS Management" o "Zona DNS".
3. Agregá un registro:
   - Tipo: CNAME
   - Nombre / Host: www
   - Destino / Target: ${targetHost}
   - TTL: Automático o 3600
4. Agregá el registro raíz (@ o nombre de dominio) como CNAME o redirección hacia www.${cleanDomain}.
======================================================`;
  }

  return {
    domain: cleanDomain,
    slug,
    targetHost,
    isNicAr,
    instructions: instructions.trim(),
    dnsRecords
  };
}

/**
 * Genera el comando oficial de Wrangler para vincular el dominio en Cloudflare Pages
 */
export function provisionDomainCommand({
  domain = '',
  projectId = 'nexobow-previews'
} = {}) {
  const cleanDomain = String(domain).trim().toLowerCase();
  return `npx wrangler pages project domain add ${projectId} --domain ${cleanDomain}`;
}

/**
 * Verifica si los registros DNS ya resuelven al destino esperado
 */
export async function verifyDomainDns({
  domain = '',
  targetHost = DEFAULT_TARGET_HOST,
  resolver = dns
} = {}) {
  const cleanDomain = String(domain).trim().toLowerCase();
  try {
    const cnames = await resolver.resolveCname(cleanDomain);
    const pointsToTarget = cnames.some((h) => h.toLowerCase() === targetHost.toLowerCase());

    return {
      domain: cleanDomain,
      verified: pointsToTarget,
      pointsToTarget,
      resolvedTargets: cnames
    };
  } catch (err) {
    return {
      domain: cleanDomain,
      verified: false,
      pointsToTarget: false,
      error: err.message
    };
  }
}

// Ejecución como CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let domain = '';
  let slug = '';
  let check = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--domain' || args[i] === '-d') domain = args[++i];
    else if (args[i] === '--slug' || args[i] === '-s') slug = args[++i];
    else if (args[i] === '--check' || args[i] === '-c') check = true;
  }

  if (!domain) {
    console.error(`Uso: node scripts/domain-provisioner.mjs --domain <dominio> [--slug <slug>] [--check]`);
    process.exit(1);
  }

  const instructions = generateDnsInstructions({ domain, slug });
  console.log(instructions.instructions);

  const wranglerCmd = provisionDomainCommand({ domain });
  console.log(`\n💻 COMANDO PARA VINCULAR EN CLOUDFLARE PAGES:`);
  console.log(`> ${wranglerCmd}\n`);

  if (check) {
    console.log(`🔍 Verificando resolución DNS para "${domain}"...`);
    verifyDomainDns({ domain }).then((res) => {
      if (res.verified) {
        console.log(`✅ DOMINIO VERIFICADO: Apunta correctamente a ${DEFAULT_TARGET_HOST}`);
      } else {
        console.log(`⚠️ PENDIENTE: El dominio aún no resuelve a ${DEFAULT_TARGET_HOST} (${res.error || 'apunta a otro host'})`);
      }
    });
  }
}
