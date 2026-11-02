// tests/admin-finances.test.mjs — Suite TDD para Finanzas Multi-Unidad y Cashflow Consolidado (Ticket 41)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_FILE = join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20261102020000_financial_transactions_init.sql"
);
const FINANCES_LIB = join(REPO_ROOT, "web", "src", "lib", "finances.ts");
const FINANCE_VIEW_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "views",
  "FinanceView.tsx"
);
const FINANCE_REEXPORT_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "FinanceView.tsx"
);
const ADMIN_APP_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminApp.tsx"
);

test("T41: Finanzas Multi-Unidad y Cashflow Consolidado", async (t) => {
  // --- SEAM 1: MIGRACIÓN SQL Y POLÍTICAS RLS ---
  await t.test(
    "1. Migración SQL crea tabla financial_transactions, enums, índices y RLS estricto",
    () => {
      assert.ok(
        existsSync(MIGRATION_FILE),
        `La migración ${MIGRATION_FILE} debe existir`
      );
      const sql = readFileSync(MIGRATION_FILE, "utf8");

      // Validar enums
      assert.match(
        sql,
        /CREATE TYPE public\.business_unit_type AS ENUM/i,
        "Debe crear enum business_unit_type"
      );
      assert.match(
        sql,
        /'nexobow'[\s\S]*'alaynow'[\s\S]*'gastos_operativos'[\s\S]*'gastos_personales'/i,
        "business_unit_type debe incluir las 4 unidades de negocio"
      );
      assert.match(
        sql,
        /CREATE TYPE public\.financial_flow_type AS ENUM/i,
        "Debe crear enum financial_flow_type ('ingreso', 'egreso')"
      );
      assert.match(
        sql,
        /CREATE TYPE public\.recurrence_type AS ENUM/i,
        "Debe crear enum recurrence_type ('unico', 'mensual', 'anual')"
      );
      assert.match(
        sql,
        /CREATE TYPE public\.currency_type AS ENUM/i,
        "Debe crear enum currency_type ('ARS', 'USD')"
      );

      // Validar tabla financial_transactions
      assert.match(
        sql,
        /CREATE TABLE IF NOT EXISTS public\.financial_transactions/i,
        "Debe crear la tabla public.financial_transactions"
      );
      assert.match(
        sql,
        /business_unit public\.business_unit_type/i,
        "Debe contener columna business_unit con enum business_unit_type"
      );
      assert.match(
        sql,
        /flow_type public\.financial_flow_type/i,
        "Debe contener columna flow_type con enum financial_flow_type"
      );
      assert.match(
        sql,
        /amount numeric/i,
        "Debe contener columna amount de tipo numérico"
      );
      assert.match(
        sql,
        /exchange_rate numeric/i,
        "Debe contener columna exchange_rate para tipo de cambio"
      );
      assert.match(
        sql,
        /recurrence public\.recurrence_type/i,
        "Debe contener columna recurrence para fijos/variables"
      );
      assert.match(
        sql,
        /lead_id bigint REFERENCES public\.leads\(id\)/i,
        "Debe tener relación opcional de clave foránea con public.leads(id)"
      );

      // Validar RLS y Políticas
      assert.match(
        sql,
        /ALTER TABLE public\.financial_transactions ENABLE ROW LEVEL SECURITY/i,
        "Debe habilitar Row Level Security (RLS)"
      );
      assert.match(
        sql,
        /CREATE POLICY "Admin owner has full access to financial_transactions"/i,
        "Debe crear la política restrictiva para el admin owner"
      );
    }
  );

  // --- SEAM 2: CONVERSIÓN DE DIVISAS Y FORMATEO ---
  await t.test(
    "2. Funciones de conversión de divisa y formateadores ARS / USD",
    async () => {
      assert.ok(existsSync(FINANCES_LIB), `El módulo ${FINANCES_LIB} debe existir`);
      const {
        convertCurrency,
        calculateTransactionAmountInArs,
        formatArs,
        formatUsd,
      } = await import(FINANCES_LIB);

      // Misma divisa
      assert.equal(convertCurrency(1000, "ARS", "ARS", 1200), 1000);
      assert.equal(convertCurrency(50, "USD", "USD", 1200), 50);

      // USD a ARS
      assert.equal(convertCurrency(100, "USD", "ARS", 1250), 125000);
      assert.equal(convertCurrency(15.5, "USD", "ARS", 1200), 18600);

      // ARS a USD
      assert.equal(convertCurrency(125000, "ARS", "USD", 1250), 100);
      assert.equal(convertCurrency(60000, "ARS", "USD", 1200), 50);

      // Manejo de tasa cero o negativa
      assert.equal(convertCurrency(100, "ARS", "USD", 0), 0);
      assert.equal(convertCurrency(100, "USD", "ARS", 0), 0);

      // calculateTransactionAmountInArs
      const txArs = { amount: 189999, currency: "ARS", exchange_rate: 1250 };
      assert.equal(calculateTransactionAmountInArs(txArs), 189999);

      const txUsd = { amount: 100, currency: "USD", exchange_rate: 1250 };
      assert.equal(calculateTransactionAmountInArs(txUsd), 125000);

      // Formateadores
      assert.match(formatArs(189999), /\$189\.999\s*ARS/);
      assert.match(formatArs(0), /\$0\s*ARS/);
      assert.match(formatUsd(150.5), /\$150[,.]50\s*USD|USD\s*\$150[,.]50|USD\s*150/i);
    }
  );

  // --- SEAM 3: FILTRADO Y AGREGACIÓN CONTABLE ---
  await t.test(
    "3. Filtrado por período YYYY-MM y unidad de negocio",
    async () => {
      assert.ok(existsSync(FINANCES_LIB), `El módulo ${FINANCES_LIB} debe existir`);
      const {
        filterTransactionsByPeriod,
        filterTransactionsByUnit,
      } = await import(FINANCES_LIB);

      const sampleTransactions = [
        {
          id: 1,
          business_unit: "nexobow",
          flow_type: "ingreso",
          category: "Setup Web",
          description: "Setup Landing Lic. Sofía Ramos",
          amount: 189999,
          currency: "ARS",
          exchange_rate: 1250,
          recurrence: "unico",
          transaction_date: "2026-10-15",
        },
        {
          id: 2,
          business_unit: "nexobow",
          flow_type: "ingreso",
          category: "Abono Mensual",
          description: "Mantenimiento mensual",
          amount: 12259,
          currency: "ARS",
          exchange_rate: 1250,
          recurrence: "mensual",
          transaction_date: "2026-11-01",
        },
        {
          id: 3,
          business_unit: "alaynow",
          flow_type: "ingreso",
          category: "YouTube AdSense",
          description: "Monetización canal",
          amount: 120,
          currency: "USD",
          exchange_rate: 1250,
          recurrence: "mensual",
          transaction_date: "2026-11-05",
        },
        {
          id: 4,
          business_unit: "gastos_operativos",
          flow_type: "egreso",
          category: "Software & SaaS",
          description: "Suscripción Supabase & Cloudflare",
          amount: 25,
          currency: "USD",
          exchange_rate: 1250,
          recurrence: "mensual",
          transaction_date: "2026-11-02",
        },
        {
          id: 5,
          business_unit: "gastos_personales",
          flow_type: "egreso",
          category: "Alimentación",
          description: "Supermercado",
          amount: 65000,
          currency: "ARS",
          exchange_rate: 1250,
          recurrence: "unico",
          transaction_date: "2026-11-03",
        },
      ];

      // Filtrado por período
      const novTx = filterTransactionsByPeriod(sampleTransactions, "2026-11");
      assert.equal(novTx.length, 4, "Debe haber 4 transacciones en noviembre 2026");

      const octTx = filterTransactionsByPeriod(sampleTransactions, "2026-10");
      assert.equal(octTx.length, 1, "Debe haber 1 transacción en octubre 2026");

      // Filtrado por unidad
      const nexoTx = filterTransactionsByUnit(sampleTransactions, "nexobow");
      assert.equal(nexoTx.length, 2, "Debe haber 2 transacciones de NexoBow");

      const allTx = filterTransactionsByUnit(sampleTransactions, "all");
      assert.equal(allTx.length, 5, "Debe devolver todas al pedir 'all'");
    }
  );

  // --- SEAM 4: BALANCE MENSUAL Y CÁLCULO DE CASHFLOW Y MARGEN ---
  await t.test(
    "4. computeMonthlyBalance calcula KPIs, margen %, fijos vs variables y desglose por unidad",
    async () => {
      assert.ok(existsSync(FINANCES_LIB), `El módulo ${FINANCES_LIB} debe existir`);
      const {
        computeMonthlyBalance,
      } = await import(FINANCES_LIB);

      const sampleNov = [
        // Ingreso NexoBow ARS: $189.999
        {
          id: 1,
          business_unit: "nexobow",
          flow_type: "ingreso",
          category: "Setup Web",
          description: "Setup Lic. Ramos",
          amount: 189999,
          currency: "ARS",
          exchange_rate: 1250,
          recurrence: "unico",
          transaction_date: "2026-11-01",
        },
        // Ingreso AlayNow USD: 200 USD = 200 * 1250 = $250.000 ARS
        {
          id: 2,
          business_unit: "alaynow",
          flow_type: "ingreso",
          category: "YouTube AdSense",
          description: "Ingresos por vistas",
          amount: 200,
          currency: "USD",
          exchange_rate: 1250,
          recurrence: "mensual",
          transaction_date: "2026-11-05",
        },
        // Egreso Operativo Fijo USD: 40 USD = 40 * 1250 = $50.000 ARS
        {
          id: 3,
          business_unit: "gastos_operativos",
          flow_type: "egreso",
          category: "Software & Hosting",
          description: "Infraestructura Cloudflare & Supabase",
          amount: 40,
          currency: "USD",
          exchange_rate: 1250,
          recurrence: "mensual",
          transaction_date: "2026-11-02",
        },
        // Egreso Personal Variable ARS: $89.999 ARS
        {
          id: 4,
          business_unit: "gastos_personales",
          flow_type: "egreso",
          category: "Varios",
          description: "Gastos personales varios",
          amount: 89999,
          currency: "ARS",
          exchange_rate: 1250,
          recurrence: "unico",
          transaction_date: "2026-11-10",
        },
      ];

      const balance = computeMonthlyBalance(sampleNov, "2026-11", 1250);

      // Ingresos Totales ARS: 189.999 + 250.000 = 439.999
      assert.equal(balance.total_income_ars, 439999);

      // Gastos Totales ARS: 50.000 + 89.999 = 139.999
      assert.equal(balance.total_expense_ars, 139999);

      // Cashflow Neto ARS: 439.999 - 139.999 = 300.000
      assert.equal(balance.net_cashflow_ars, 300000);

      // Margen Neto %: (300.000 / 439.999) * 100 = 68.18%
      const expectedMargin = Math.round((300000 / 439999) * 10000) / 100;
      assert.equal(balance.net_margin_percentage, expectedMargin);

      // Costos fijos vs variables
      assert.equal(balance.recurring_fixed_expenses_ars, 50000, "Gastos fijos deben ser 50.000 ARS");
      assert.equal(balance.variable_expenses_ars, 89999, "Gastos variables deben ser 89.999 ARS");

      // Desglose por unidad
      assert.equal(balance.by_unit.nexobow.income_ars, 189999);
      assert.equal(balance.by_unit.nexobow.expense_ars, 0);
      assert.equal(balance.by_unit.nexobow.net_cashflow_ars, 189999);

      assert.equal(balance.by_unit.alaynow.income_ars, 250000);
      assert.equal(balance.by_unit.alaynow.expense_ars, 0);
      assert.equal(balance.by_unit.alaynow.net_cashflow_ars, 250000);

      assert.equal(balance.by_unit.gastos_operativos.income_ars, 0);
      assert.equal(balance.by_unit.gastos_operativos.expense_ars, 50000);
      assert.equal(balance.by_unit.gastos_operativos.net_cashflow_ars, -50000);

      assert.equal(balance.by_unit.gastos_personales.income_ars, 0);
      assert.equal(balance.by_unit.gastos_personales.expense_ars, 89999);
      assert.equal(balance.by_unit.gastos_personales.net_cashflow_ars, -89999);

      assert.equal(balance.transactions_count, 4);
    }
  );

  // --- SEAM 5: TENDENCIAS HISTÓRICAS MULTI-MES ---
  await t.test(
    "5. computeMultiMonthCashflowTrends genera evolución histórica de flujo de caja",
    async () => {
      assert.ok(existsSync(FINANCES_LIB), `El módulo ${FINANCES_LIB} debe existir`);
      const {
        computeMultiMonthCashflowTrends,
      } = await import(FINANCES_LIB);

      const multiMonthTx = [
        {
          id: 1,
          business_unit: "nexobow",
          flow_type: "ingreso",
          category: "Setup",
          description: "Setup Octubre",
          amount: 100000,
          currency: "ARS",
          exchange_rate: 1200,
          recurrence: "unico",
          transaction_date: "2026-10-10",
        },
        {
          id: 2,
          business_unit: "gastos_operativos",
          flow_type: "egreso",
          category: "SaaS",
          description: "Hosting Octubre",
          amount: 30000,
          currency: "ARS",
          exchange_rate: 1200,
          recurrence: "mensual",
          transaction_date: "2026-10-15",
        },
        {
          id: 3,
          business_unit: "nexobow",
          flow_type: "ingreso",
          category: "Setup",
          description: "Setup Noviembre",
          amount: 200000,
          currency: "ARS",
          exchange_rate: 1250,
          recurrence: "unico",
          transaction_date: "2026-11-10",
        },
        {
          id: 4,
          business_unit: "gastos_operativos",
          flow_type: "egreso",
          category: "SaaS",
          description: "Hosting Noviembre",
          amount: 40000,
          currency: "ARS",
          exchange_rate: 1250,
          recurrence: "mensual",
          transaction_date: "2026-11-15",
        },
      ];

      const trends = computeMultiMonthCashflowTrends(multiMonthTx, [
        "2026-09",
        "2026-10",
        "2026-11",
      ]);

      assert.equal(trends.length, 3);
      assert.equal(trends[0].period, "2026-09");
      assert.equal(trends[0].income_ars, 0);
      assert.equal(trends[0].expense_ars, 0);
      assert.equal(trends[0].net_cashflow_ars, 0);

      assert.equal(trends[1].period, "2026-10");
      assert.equal(trends[1].income_ars, 100000);
      assert.equal(trends[1].expense_ars, 30000);
      assert.equal(trends[1].net_cashflow_ars, 70000);

      assert.equal(trends[2].period, "2026-11");
      assert.equal(trends[2].income_ars, 200000);
      assert.equal(trends[2].expense_ars, 40000);
      assert.equal(trends[2].net_cashflow_ars, 160000);
    }
  );

  // --- SEAM 6: COMPONENTE REACT Y ENRUTAMIENTO EN COCKPIT ---
  await t.test(
    "6. FinanceView implementa selector de período, KPIs, gráficos de barra y modal de registro",
    () => {
      assert.ok(
        existsSync(FINANCE_VIEW_FILE),
        `El archivo ${FINANCE_VIEW_FILE} debe existir`
      );
      assert.ok(
        existsSync(FINANCE_REEXPORT_FILE),
        `El archivo de re-exportación ${FINANCE_REEXPORT_FILE} debe existir`
      );

      const viewContent = readFileSync(FINANCE_VIEW_FILE, "utf8");

      // Validar exportaciones y elementos visuales clave
      assert.match(
        viewContent,
        /export (const|function) FinanceView/i,
        "Debe exportar el componente FinanceView"
      );
      assert.match(
        viewContent,
        /Ingresos Totales/i,
        "Debe incluir tarjeta KPI de Ingresos Totales"
      );
      assert.match(
        viewContent,
        /Gastos Totales/i,
        "Debe incluir tarjeta KPI de Gastos Totales"
      );
      assert.match(
        viewContent,
        /Cashflow Neto|Flujo Neto/i,
        "Debe incluir tarjeta KPI de Cashflow Neto"
      );
      assert.match(
        viewContent,
        /Margen Neto/i,
        "Debe incluir tarjeta KPI de Margen Neto %"
      );
      assert.match(
        viewContent,
        /nexobow|alaynow|gastos_operativos|gastos_personales/i,
        "Debe representar las 4 unidades de negocio"
      );

      // Validar presencia de modal/drawer para asentar transacciones
      assert.match(
        viewContent,
        /Nueva Transacción|Registrar Transacción/i,
        "Debe incluir trigger o título para registrar nueva transacción"
      );

      // Validar integración en AdminApp.tsx
      const appContent = readFileSync(ADMIN_APP_FILE, "utf8");
      assert.match(
        appContent,
        /FinanceView/i,
        "AdminApp.tsx debe importar FinanceView"
      );
      assert.match(
        appContent,
        /\/admin\/finances/i,
        "AdminApp.tsx debe enrutar /admin/finances hacia FinanceView"
      );
    }
  );
});
