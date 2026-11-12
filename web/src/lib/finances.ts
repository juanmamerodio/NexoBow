import { getBrowserSupabaseClient } from "./supabase.ts";

export type BusinessUnit =
  | "nexobow"
  | "alaynow"
  | "gastos_operativos"
  | "gastos_personales";

export type FinancialFlowType = "ingreso" | "egreso";

export type RecurrenceType = "unico" | "mensual" | "anual";

export type CurrencyType = "ARS" | "USD";

export interface FinancialTransaction {
  id?: number | string;
  business_unit: BusinessUnit;
  flow_type: FinancialFlowType;
  category: string;
  description: string;
  amount: number;
  currency: CurrencyType;
  exchange_rate: number;
  recurrence: RecurrenceType;
  transaction_date: string; // YYYY-MM-DD
  lead_id?: number | null;
  status?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface UnitBalance {
  income_ars: number;
  expense_ars: number;
  net_cashflow_ars: number;
}

export interface MonthlyBalance {
  period: string; // YYYY-MM
  total_income_ars: number;
  total_expense_ars: number;
  net_cashflow_ars: number;
  net_margin_percentage: number;
  by_unit: Record<BusinessUnit, UnitBalance>;
  recurring_fixed_expenses_ars: number;
  variable_expenses_ars: number;
  transactions_count: number;
}

export interface MonthlyCashflowTrend {
  period: string;
  income_ars: number;
  expense_ars: number;
  net_cashflow_ars: number;
}

export const DEFAULT_USD_EXCHANGE_RATE = 1250;

export const BUSINESS_UNITS: Array<{
  id: BusinessUnit;
  label: string;
  sublabel: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}> = [
  {
    id: "nexobow",
    label: "NexoBow Agency",
    sublabel: "Fábrica B2B & Previews",
    color: "#BF40FA", // Hyper Magenta
    badgeBg: "rgba(191, 64, 250, 0.12)",
    borderColor: "rgba(191, 64, 250, 0.3)",
  },
  {
    id: "alaynow",
    label: "AlayNow Media",
    sublabel: "YouTube & Producción",
    color: "#EF4444", // Red
    badgeBg: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  {
    id: "gastos_operativos",
    label: "Gastos Operativos",
    sublabel: "Infra, Herramientas & SaaS",
    color: "#3B82F6", // Blue
    badgeBg: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  {
    id: "gastos_personales",
    label: "Gastos Personales",
    sublabel: "Estilo de Vida & Hogar",
    color: "#10B981", // Emerald
    badgeBg: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
];

export const CATEGORIES_BY_UNIT: Record<BusinessUnit, string[]> = {
  nexobow: [
    "Tier 1 · Setup Starter ($189.999 ARS · $0/mes Año 1)",
    "Tier 2 · Setup Autonomous ($549.999 ARS)",
    "Tier 2 · Abono Mensual Autonomous ($229.999 ARS/mes)",
    "Alianza Audiovisual AfterBow",
    "Adicional Dominio (.com.ar / .com)",
    "Renovación Anual Starter",
    "Otros Ingresos Agencia",
  ],
  alaynow: [
    "YouTube AdSense (USD)",
    "Sponsorship / Patrocinios",
    "Afiliados y Referidos",
    "Equipamiento Audiovisual",
    "Licencias de Música y FX",
    "Otros Medios y Contenido",
  ],
  gastos_operativos: [
    "Software & SaaS (Supabase / CF)",
    "Hosting & Dominios",
    "APIs & LLMs (OpenAI / Gemini)",
    "Contador & Impuestos",
    "Telefonía & Internet",
    "Hardware & Mantenimiento",
    "Otros Costos Operativos",
  ],
  gastos_personales: [
    "Vivienda & Alquiler",
    "Alimentación & Supermercado",
    "Transporte & Combustible",
    "Salud & Bienestar",
    "Educación & Cursos",
    "Ocio & Entretenimiento",
    "Otros Gastos Personales",
  ],
};

/**
 * Convierte un monto entre ARS y USD aplicando una tasa de cambio.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyType,
  to: CurrencyType,
  exchangeRate: number
): number {
  if (amount === 0) return 0;
  if (from === to) return Math.round(amount * 100) / 100;
  if (exchangeRate <= 0) return 0;

  if (from === "USD" && to === "ARS") {
    return Math.round(amount * exchangeRate * 100) / 100;
  }
  if (from === "ARS" && to === "USD") {
    return Math.round((amount / exchangeRate) * 100) / 100;
  }
  return amount;
}

/**
 * Calcula el monto equivalente en Pesos Argentinos (ARS) de una transacción.
 */
export function calculateTransactionAmountInArs(tx: {
  amount: number;
  currency: CurrencyType;
  exchange_rate?: number;
}): number {
  const rate = tx.exchange_rate && tx.exchange_rate > 0 ? tx.exchange_rate : DEFAULT_USD_EXCHANGE_RATE;
  return convertCurrency(tx.amount, tx.currency, "ARS", rate);
}

/**
 * Formatea un número en formato monetario Pesos Argentinos (ej. "$189.999 ARS").
 */
export function formatArs(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString("es-AR");
  return `$${formatted} ARS`;
}

/**
 * Formatea un número en formato monetario Dólares Estadounidenses (ej. "$100,00 USD").
 */
export function formatUsd(amount: number): string {
  const formatted = amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formatted} USD`;
}

/**
 * Filtra transacciones por período YYYY-MM según la fecha contable.
 */
export function filterTransactionsByPeriod(
  transactions: FinancialTransaction[],
  period: string
): FinancialTransaction[] {
  return transactions.filter((tx) => tx.transaction_date && tx.transaction_date.startsWith(period));
}

/**
 * Filtra transacciones por unidad de negocio o devuelve todas si se especifica 'all'.
 */
export function filterTransactionsByUnit(
  transactions: FinancialTransaction[],
  unit: BusinessUnit | "all"
): FinancialTransaction[] {
  if (unit === "all") return transactions;
  return transactions.filter((tx) => tx.business_unit === unit);
}

/**
 * Agrega y calcula el balance contable mensual:
 * - Ingresos totales en ARS
 * - Egresos totales en ARS
 * - Flujo neto de caja (Cashflow neto)
 * - Margen neto porcentual
 * - Costos fijos (recurrentes) vs variables
 * - Desglose independiente por cada una de las 4 unidades de negocio
 */
export function computeMonthlyBalance(
  transactions: FinancialTransaction[],
  period: string,
  defaultExchangeRate = DEFAULT_USD_EXCHANGE_RATE
): MonthlyBalance {
  const periodTransactions = filterTransactionsByPeriod(transactions, period);

  const by_unit: Record<BusinessUnit, UnitBalance> = {
    nexobow: { income_ars: 0, expense_ars: 0, net_cashflow_ars: 0 },
    alaynow: { income_ars: 0, expense_ars: 0, net_cashflow_ars: 0 },
    gastos_operativos: { income_ars: 0, expense_ars: 0, net_cashflow_ars: 0 },
    gastos_personales: { income_ars: 0, expense_ars: 0, net_cashflow_ars: 0 },
  };

  let total_income_ars = 0;
  let total_expense_ars = 0;
  let recurring_fixed_expenses_ars = 0;
  let variable_expenses_ars = 0;

  for (const tx of periodTransactions) {
    const rate = tx.exchange_rate && tx.exchange_rate > 0 ? tx.exchange_rate : defaultExchangeRate;
    const amountInArs = convertCurrency(tx.amount, tx.currency, "ARS", rate);

    const unit = tx.business_unit;
    if (by_unit[unit]) {
      if (tx.flow_type === "ingreso") {
        by_unit[unit].income_ars += amountInArs;
        total_income_ars += amountInArs;
      } else {
        by_unit[unit].expense_ars += amountInArs;
        total_expense_ars += amountInArs;

        if (tx.recurrence === "mensual" || tx.recurrence === "anual") {
          recurring_fixed_expenses_ars += amountInArs;
        } else {
          variable_expenses_ars += amountInArs;
        }
      }
    }
  }

  // Redondear y calcular balance por unidad
  for (const key of Object.keys(by_unit) as BusinessUnit[]) {
    by_unit[key].income_ars = Math.round(by_unit[key].income_ars * 100) / 100;
    by_unit[key].expense_ars = Math.round(by_unit[key].expense_ars * 100) / 100;
    by_unit[key].net_cashflow_ars =
      Math.round((by_unit[key].income_ars - by_unit[key].expense_ars) * 100) / 100;
  }

  total_income_ars = Math.round(total_income_ars * 100) / 100;
  total_expense_ars = Math.round(total_expense_ars * 100) / 100;
  recurring_fixed_expenses_ars = Math.round(recurring_fixed_expenses_ars * 100) / 100;
  variable_expenses_ars = Math.round(variable_expenses_ars * 100) / 100;

  const net_cashflow_ars = Math.round((total_income_ars - total_expense_ars) * 100) / 100;
  const net_margin_percentage =
    total_income_ars > 0
      ? Math.round((net_cashflow_ars / total_income_ars) * 10000) / 100
      : 0;

  return {
    period,
    total_income_ars,
    total_expense_ars,
    net_cashflow_ars,
    net_margin_percentage,
    by_unit,
    recurring_fixed_expenses_ars,
    variable_expenses_ars,
    transactions_count: periodTransactions.length,
  };
}

/**
 * Computa la evolución histórica mensual del flujo de caja a través de una lista de períodos.
 */
export function computeMultiMonthCashflowTrends(
  transactions: FinancialTransaction[],
  months: string[]
): MonthlyCashflowTrend[] {
  return months.map((month) => {
    const bal = computeMonthlyBalance(transactions, month);
    return {
      period: month,
      income_ars: bal.total_income_ars,
      expense_ars: bal.total_expense_ars,
      net_cashflow_ars: bal.net_cashflow_ars,
    };
  });
}

// -------------------------------------------------------------
// Adaptador de Persistencia Supabase para Transacciones
// -------------------------------------------------------------

export async function fetchFinancialTransactions(
  customClient?: any
): Promise<FinancialTransaction[] & { data: FinancialTransaction[]; isOffline: boolean }> {
  try {
    const supabase = customClient || getBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("financial_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    if (error) {
      console.error("Error consultando financial_transactions de Supabase:", error);
      const fallback: FinancialTransaction[] = [];
      return Object.assign(fallback, { data: fallback, isOffline: true });
    }
    const rows: FinancialTransaction[] = (data || []).map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      exchange_rate: Number(row.exchange_rate || DEFAULT_USD_EXCHANGE_RATE),
    }));
    return Object.assign(rows, { data: rows, isOffline: false });
  } catch (err) {
    console.error("Excepción consultando financial_transactions:", err);
    const fallback: FinancialTransaction[] = [];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }
}

export async function saveFinancialTransaction(
  tx: Omit<FinancialTransaction, "id" | "created_at" | "updated_at"> & { id?: number | string }
): Promise<{ ok: boolean; data?: FinancialTransaction; error?: string }> {
  const supabase = getBrowserSupabaseClient();

  const payload: any = {
    business_unit: tx.business_unit,
    flow_type: tx.flow_type,
    category: tx.category,
    description: tx.description,
    amount: tx.amount,
    currency: tx.currency,
    exchange_rate: tx.exchange_rate || DEFAULT_USD_EXCHANGE_RATE,
    recurrence: tx.recurrence,
    transaction_date: tx.transaction_date,
    lead_id: tx.lead_id || null,
    status: tx.status || "completado",
    metadata: tx.metadata || {},
  };

  if (tx.id) {
    const { data, error } = await supabase
      .from("financial_transactions")
      .update(payload)
      .eq("id", tx.id)
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  } else {
    const { data, error } = await supabase
      .from("financial_transactions")
      .insert([payload])
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}

export async function deleteFinancialTransaction(id: number | string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
