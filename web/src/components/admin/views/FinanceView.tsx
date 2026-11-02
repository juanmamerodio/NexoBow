// web/src/components/admin/views/FinanceView.tsx — Módulo Financiero Multi-Unidad y Cashflow Consolidado
import React, { useState, useEffect, useMemo } from "react";
import {
  type FinancialTransaction,
  type BusinessUnit,
  type FinancialFlowType,
  type RecurrenceType,
  type CurrencyType,
  BUSINESS_UNITS,
  CATEGORIES_BY_UNIT,
  DEFAULT_USD_EXCHANGE_RATE,
  computeMonthlyBalance,
  computeMultiMonthCashflowTrends,
  formatArs,
  formatUsd,
  convertCurrency,
  fetchFinancialTransactions,
  saveFinancialTransaction,
  deleteFinancialTransaction,
} from "../../../lib/finances.ts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  Plus,
  Trash2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PieChart,
  BarChart3,
  CreditCard,
  Building,
  Briefcase,
  Tv,
  Wallet,
  Home,
} from "lucide-react";

interface FinanceViewProps {
  onNavigate?: (path: string) => void;
}

// Semilla de transacciones iniciales en caso de base de datos vacía o sin conexión
const INITIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 1,
    business_unit: "nexobow",
    flow_type: "ingreso",
    category: "Setup Web ($189.999 ARS)",
    description: "Setup Inicial Landing + Embudo Lic. Mari Calcagno",
    amount: 189999,
    currency: "ARS",
    exchange_rate: 1250,
    recurrence: "unico",
    transaction_date: "2026-11-01",
    status: "completado",
  },
  {
    id: 2,
    business_unit: "nexobow",
    flow_type: "ingreso",
    category: "Abono Mensual ($12.259 ARS)",
    description: "Mantenimiento & Hosting Lic. Sofía Ramos",
    amount: 12259,
    currency: "ARS",
    exchange_rate: 1250,
    recurrence: "mensual",
    transaction_date: "2026-11-01",
    status: "completado",
  },
  {
    id: 3,
    business_unit: "alaynow",
    flow_type: "ingreso",
    category: "YouTube AdSense (USD)",
    description: "Monetización canal YouTube AlayNow",
    amount: 240,
    currency: "USD",
    exchange_rate: 1250,
    recurrence: "mensual",
    transaction_date: "2026-11-02",
    status: "completado",
  },
  {
    id: 4,
    business_unit: "alaynow",
    flow_type: "ingreso",
    category: "Sponsorship / Patrocinios",
    description: "Integración Audiovisual Alianza AfterBow",
    amount: 150000,
    currency: "ARS",
    exchange_rate: 1250,
    recurrence: "unico",
    transaction_date: "2026-11-04",
    status: "completado",
  },
  {
    id: 5,
    business_unit: "gastos_operativos",
    flow_type: "egreso",
    category: "Software & SaaS (Supabase / CF)",
    description: "Cloudflare Pages Pro & Supabase Database",
    amount: 45,
    currency: "USD",
    exchange_rate: 1250,
    recurrence: "mensual",
    transaction_date: "2026-11-02",
    status: "completado",
  },
  {
    id: 6,
    business_unit: "gastos_operativos",
    flow_type: "egreso",
    category: "APIs & LLMs (OpenAI / Gemini)",
    description: "Consumo de API Gemini / Antigravity / Serper",
    amount: 32,
    currency: "USD",
    exchange_rate: 1250,
    recurrence: "mensual",
    transaction_date: "2026-11-03",
    status: "completado",
  },
  {
    id: 7,
    business_unit: "gastos_personales",
    flow_type: "egreso",
    category: "Vivienda & Alquiler",
    description: "Alquiler departamento mensual",
    amount: 180000,
    currency: "ARS",
    exchange_rate: 1250,
    recurrence: "mensual",
    transaction_date: "2026-11-01",
    status: "completado",
  },
  {
    id: 8,
    business_unit: "gastos_personales",
    flow_type: "egreso",
    category: "Alimentación & Supermercado",
    description: "Compra quincenal de víveres",
    amount: 85000,
    currency: "ARS",
    exchange_rate: 1250,
    recurrence: "unico",
    transaction_date: "2026-11-04",
    status: "completado",
  },
  // Transacciones de Octubre para comparativa histórica
  {
    id: 9,
    business_unit: "nexobow",
    flow_type: "ingreso",
    category: "Setup Web ($189.999 ARS)",
    description: "Setup Inicial Dr. Javier Gómez Abogado",
    amount: 189999,
    currency: "ARS",
    exchange_rate: 1200,
    recurrence: "unico",
    transaction_date: "2026-10-18",
    status: "completado",
  },
  {
    id: 10,
    business_unit: "gastos_operativos",
    flow_type: "egreso",
    category: "Software & SaaS (Supabase / CF)",
    description: "Infraestructura mensual",
    amount: 40,
    currency: "USD",
    exchange_rate: 1200,
    recurrence: "mensual",
    transaction_date: "2026-10-05",
    status: "completado",
  },
];

export const FinanceView: React.FC<FinanceViewProps> = ({ onNavigate }) => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(INITIAL_TRANSACTIONS);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-11");
  const [globalExchangeRate, setGlobalExchangeRate] = useState<number>(DEFAULT_USD_EXCHANGE_RATE);
  const [unitFilter, setUnitFilter] = useState<BusinessUnit | "all">("all");
  const [flowFilter, setFlowFilter] = useState<FinancialFlowType | "all">("all");
  const [recurrenceFilter, setRecurrenceFilter] = useState<RecurrenceType | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>("");

  // Form State para nueva transacción
  const [formUnit, setFormUnit] = useState<BusinessUnit>("nexobow");
  const [formFlow, setFormFlow] = useState<FinancialFlowType>("ingreso");
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES_BY_UNIT.nexobow[0]);
  const [formCustomCategory, setFormCustomCategory] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formCurrency, setFormCurrency] = useState<CurrencyType>("ARS");
  const [formRate, setFormRate] = useState<string>(String(DEFAULT_USD_EXCHANGE_RATE));
  const [formRecurrence, setFormRecurrence] = useState<RecurrenceType>("unico");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Cargar transacciones desde Supabase al montar
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchFinancialTransactions();
        if (mounted && data.length > 0) {
          setTransactions(data);
        }
      } catch (err) {
        console.error("Error al cargar finanzas:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Notificaciones temporales
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  // Cálculo de Balance Mensual Consolidado
  const monthlyBalance = useMemo(() => {
    return computeMonthlyBalance(transactions, selectedPeriod, globalExchangeRate);
  }, [transactions, selectedPeriod, globalExchangeRate]);

  // Tendencia multi-mes
  const trendPeriods = useMemo(() => {
    const [yearStr, monthStr] = selectedPeriod.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const periods: string[] = [];
    for (let i = 2; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      periods.push(`${y}-${String(m).padStart(2, "0")}`);
    }
    return periods;
  }, [selectedPeriod]);

  const trends = useMemo(() => {
    return computeMultiMonthCashflowTrends(transactions, trendPeriods);
  }, [transactions, trendPeriods]);

  // Transacciones filtradas para la tabla
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Período
      if (!tx.transaction_date.startsWith(selectedPeriod)) return false;
      // Unidad
      if (unitFilter !== "all" && tx.business_unit !== unitFilter) return false;
      // Flujo
      if (flowFilter !== "all" && tx.flow_type !== flowFilter) return false;
      // Recurrencia
      if (recurrenceFilter !== "all" && tx.recurrence !== recurrenceFilter) return false;
      // Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesCat = tx.category.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [transactions, selectedPeriod, unitFilter, flowFilter, recurrenceFilter, searchQuery]);

  // Manejar creación de transacción
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.amount = "Ingrese un monto numérico positivo mayor a 0";
    }

    const finalCategory = formCustomCategory.trim() ? formCustomCategory.trim() : formCategory;
    if (!finalCategory) {
      errors.category = "Seleccione o ingrese una categoría";
    }

    if (!formDescription.trim()) {
      errors.description = "La descripción no puede estar vacía";
    }

    const rateNum = parseFloat(formRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      errors.rate = "El tipo de cambio debe ser un número positivo";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const newTx: FinancialTransaction = {
      id: Date.now(),
      business_unit: formUnit,
      flow_type: formFlow,
      category: finalCategory,
      description: formDescription.trim(),
      amount: amountNum,
      currency: formCurrency,
      exchange_rate: rateNum,
      recurrence: formRecurrence,
      transaction_date: formDate,
      status: "completado",
    };

    // Actualización optimista local
    setTransactions((prev) => [newTx, ...prev]);
    setIsModalOpen(false);
    showNotification("✓ Transacción registrada con éxito");

    // Limpiar formulario
    setFormDescription("");
    setFormAmount("");
    setFormCustomCategory("");
    setFormErrors({});

    // Guardar en Supabase asíncronamente
    try {
      await saveFinancialTransaction(newTx);
    } catch (err) {
      console.warn("Guardado local exitoso, error sincronizando con Supabase:", err);
    }
  };

  // Manejar borrado de transacción
  const handleDeleteTransaction = async (id: number | string) => {
    if (typeof window !== "undefined" && !window.confirm("¿Seguro que deseas eliminar esta transacción?")) {
      return;
    }
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    showNotification("Transacción eliminada");
    try {
      await deleteFinancialTransaction(id);
    } catch (err) {
      console.warn("Eliminación local exitosa:", err);
    }
  };

  // Icono para la unidad
  const getUnitIcon = (unit: BusinessUnit) => {
    switch (unit) {
      case "nexobow":
        return <Briefcase className="w-4 h-4 text-purple-400" />;
      case "alaynow":
        return <Tv className="w-4 h-4 text-red-400" />;
      case "gastos_operativos":
        return <Building className="w-4 h-4 text-blue-400" />;
      case "gastos_personales":
        return <Home className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-950/90 border border-purple-500/40 text-purple-200 text-xs shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Superior y Controles de Período */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-purple-400" />
              Finanzas Multi-Unidad & Cashflow Consolidado
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
              Multi-Moneda ARS / USD
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Control integral de ingresos, costos fijos vs variables y flujo de caja neto para NexoBow, AlayNow y Finanzas Personales.
          </p>
        </div>

        {/* Controles de Período y Dólar */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Selector de Mes */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-[#0B0D12] text-xs">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {/* Tipo de Cambio USD */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-[#0B0D12] text-xs">
            <span className="text-zinc-400 font-mono">1 USD =</span>
            <input
              type="number"
              value={globalExchangeRate}
              onChange={(e) => setGlobalExchangeRate(Number(e.target.value) || DEFAULT_USD_EXCHANGE_RATE)}
              className="w-16 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500 text-center"
              title="Tipo de cambio de referencia para conversiones"
            />
            <span className="text-zinc-400 font-mono">ARS</span>
          </div>

          {/* Botón Nueva Transacción */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Transacción
          </button>
        </div>
      </div>

      {/* KPI Cards: Flujo Consolidado del Mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Totales */}
        <div className="p-5 rounded-2xl border border-zinc-800/80 bg-[#0B0D12] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-white mb-1">
            {formatArs(monthlyBalance.total_income_ars)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span>{monthlyBalance.transactions_count} transacciones</span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400 font-mono">
              {formatUsd(convertCurrency(monthlyBalance.total_income_ars, "ARS", "USD", globalExchangeRate))}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60" />
        </div>

        {/* Gastos Totales */}
        <div className="p-5 rounded-2xl border border-zinc-800/80 bg-[#0B0D12] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Gastos Totales</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-white mb-1">
            {formatArs(monthlyBalance.total_expense_ars)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="text-zinc-300">Fijos: {formatArs(monthlyBalance.recurring_fixed_expenses_ars)}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">Var: {formatArs(monthlyBalance.variable_expenses_ars)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-400 opacity-60" />
        </div>

        {/* Cashflow Neto */}
        <div className="p-5 rounded-2xl border border-zinc-800/80 bg-[#0B0D12] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Cashflow Neto</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                monthlyBalance.net_cashflow_ars >= 0
                  ? "bg-purple-500/10 text-purple-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl font-bold font-mono mb-1 ${
              monthlyBalance.net_cashflow_ars >= 0 ? "text-purple-300" : "text-red-400"
            }`}
          >
            {monthlyBalance.net_cashflow_ars >= 0 ? "+" : ""}
            {formatArs(monthlyBalance.net_cashflow_ars)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Flujo disponible de caja</span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-zinc-300">
              {formatUsd(convertCurrency(monthlyBalance.net_cashflow_ars, "ARS", "USD", globalExchangeRate))}
            </span>
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
              monthlyBalance.net_cashflow_ars >= 0
                ? "from-purple-500 to-indigo-500"
                : "from-red-600 to-amber-600"
            } opacity-60`}
          />
        </div>

        {/* Margen Neto % */}
        <div className="p-5 rounded-2xl border border-zinc-800/80 bg-[#0B0D12] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Margen Neto %</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-white mb-1">
            {monthlyBalance.net_margin_percentage.toFixed(1)}%
          </div>
          {/* Barra de progreso visual */}
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                monthlyBalance.net_margin_percentage >= 50
                  ? "bg-emerald-500"
                  : monthlyBalance.net_margin_percentage >= 20
                  ? "bg-purple-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(Math.max(monthlyBalance.net_margin_percentage, 0), 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {monthlyBalance.net_margin_percentage >= 50
              ? "Excelente rentabilidad operativa"
              : monthlyBalance.net_margin_percentage > 0
              ? "Rentabilidad positiva controlada"
              : "Alerta: Egresos superan ingresos"}
          </div>
        </div>
      </div>

      {/* Desglose de las 4 Unidades de Negocio */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Desglose por Unidad de Negocio ({selectedPeriod})
          </h2>
          <span className="text-xs text-zinc-500">Separación contable estricta</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUSINESS_UNITS.map((unit) => {
            const data = monthlyBalance.by_unit[unit.id];
            const isPositive = data.net_cashflow_ars >= 0;

            return (
              <div
                key={unit.id}
                className="p-5 rounded-2xl border bg-[#0B0D12] transition-all hover:border-zinc-700"
                style={{ borderColor: unit.borderColor }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getUnitIcon(unit.id)}
                    <div>
                      <h3 className="text-xs font-bold text-white leading-none">{unit.label}</h3>
                      <span className="text-[10px] text-zinc-500">{unit.sublabel}</span>
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
                    style={{ backgroundColor: unit.badgeBg, color: unit.color }}
                  >
                    {unit.id}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800/60 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Ingresos:
                    </span>
                    <span className="text-zinc-200">{formatArs(data.income_ars)}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <ArrowDownRight className="w-3 h-3 text-red-400" /> Egresos:
                    </span>
                    <span className="text-zinc-200">{formatArs(data.expense_ars)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40 font-bold">
                    <span className="text-[11px] text-zinc-300">Neto:</span>
                    <span className={isPositive ? "text-purple-300" : "text-red-400"}>
                      {isPositive ? "+" : ""}
                      {formatArs(data.net_cashflow_ars)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparativa Visual de Barras & Evolución Histórica */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-[#0B0D12]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Evolución Comparativa de Flujo de Caja
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Ingresos
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Egresos
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-3 h-3 rounded bg-purple-500 inline-block" /> Cashflow Neto
            </span>
          </div>
        </div>

        {/* Gráfico de Barras Relativo */}
        <div className="space-y-6">
          {trends.map((item) => {
            const maxVal = Math.max(item.income_ars, item.expense_ars, 1);
            const incPct = Math.round((item.income_ars / maxVal) * 100);
            const expPct = Math.round((item.expense_ars / maxVal) * 100);

            return (
              <div key={item.period} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {item.period}
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-emerald-400 font-semibold">{formatArs(item.income_ars)}</span>
                    <span className="text-zinc-600">vs</span>
                    <span className="text-red-400 font-semibold">{formatArs(item.expense_ars)}</span>
                    <span className="text-zinc-600">·</span>
                    <span className={item.net_cashflow_ars >= 0 ? "text-purple-300 font-bold" : "text-red-400 font-bold"}>
                      Neto: {formatArs(item.net_cashflow_ars)}
                    </span>
                  </div>
                </div>

                {/* Barras duales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Barra Ingresos */}
                  <div className="bg-zinc-900 rounded-lg p-1.5 border border-zinc-800">
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Ingreso</span>
                      <span className="font-mono text-emerald-400">{incPct}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${incPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Barra Egresos */}
                  <div className="bg-zinc-900 rounded-lg p-1.5 border border-zinc-800">
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Egreso</span>
                      <span className="font-mono text-red-400">{expPct}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${expPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla Detallada de Transacciones con Filtros */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#0B0D12] overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar descripción o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 w-56"
              />
            </div>

            {/* Filtro Unidad */}
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">Todas las Unidades</option>
              <option value="nexobow">NexoBow Agency</option>
              <option value="alaynow">AlayNow Media</option>
              <option value="gastos_operativos">Gastos Operativos</option>
              <option value="gastos_personales">Gastos Personales</option>
            </select>

            {/* Filtro Flujo */}
            <select
              value={flowFilter}
              onChange={(e) => setFlowFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">Todos los Flujos</option>
              <option value="ingreso">Solo Ingresos</option>
              <option value="egreso">Solo Egresos</option>
            </select>

            {/* Filtro Recurrencia */}
            <select
              value={recurrenceFilter}
              onChange={(e) => setRecurrenceFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">Todas las Recurrencias</option>
              <option value="unico">Variables (Único)</option>
              <option value="mensual">Fijos (Mensual)</option>
              <option value="anual">Fijos (Anual)</option>
            </select>
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            Mostrando <span className="text-white font-bold">{filteredTransactions.length}</span> movimientos
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Unidad</th>
                <th className="py-3 px-4">Categoría & Detalle</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Recurrencia</th>
                <th className="py-3 px-4 text-right">Monto Original</th>
                <th className="py-3 px-4 text-right">Equivalente ARS</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 font-mono">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No se encontraron transacciones registradas para este período y filtros.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const unitConfig = BUSINESS_UNITS.find((u) => u.id === tx.business_unit);
                  const isIncome = tx.flow_type === "ingreso";
                  const amountInArs = convertCurrency(
                    tx.amount,
                    tx.currency,
                    "ARS",
                    tx.exchange_rate || globalExchangeRate
                  );

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                        {tx.transaction_date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: unitConfig?.badgeBg || "rgba(255,255,255,0.05)",
                            color: unitConfig?.color || "#fff",
                          }}
                        >
                          {unitConfig?.label || tx.business_unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-zinc-200">{tx.category}</div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1">{tx.description}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit ${
                            isIncome
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isIncome ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 capitalize whitespace-nowrap">
                        {tx.recurrence}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-zinc-200">
                        {tx.currency === "USD" ? formatUsd(tx.amount) : formatArs(tx.amount)}
                        {tx.currency === "USD" && (
                          <div className="text-[10px] text-zinc-500 font-normal">
                            TC: ${tx.exchange_rate}
                          </div>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right whitespace-nowrap font-bold ${
                          isIncome ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatArs(amountInArs)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => tx.id && handleDeleteTransaction(tx.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer para Registrar Nueva Transacción */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-xl w-full rounded-2xl border border-zinc-800 bg-[#0B0D12] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Título */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Registrar Transacción Contable
              </h3>
              <p className="text-xs text-zinc-400">
                Asentá un ingreso o costo asociándolo a su unidad de negocio con conversión cambiaria.
              </p>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
              {/* Unidad de Negocio */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                  Unidad de Negocio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_UNITS.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        setFormUnit(unit.id);
                        setFormCategory(CATEGORIES_BY_UNIT[unit.id][0]);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        formUnit === unit.id
                          ? "border-purple-500 bg-purple-500/10 text-white"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {getUnitIcon(unit.id)}
                      <div>
                        <div className="font-bold text-[11px] leading-tight">{unit.label}</div>
                        <div className="text-[9px] text-zinc-500">{unit.sublabel}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sentido del Flujo (Ingreso / Egreso) */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                  Tipo de Flujo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormFlow("ingreso")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formFlow === "ingreso"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    Ingreso (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormFlow("egreso")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formFlow === "egreso"
                        ? "border-red-500 bg-red-500/10 text-red-300"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                    Egreso (-)
                  </button>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                  Categoría
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:border-purple-500 mb-2 cursor-pointer"
                >
                  {CATEGORIES_BY_UNIT[formUnit]?.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Otra">Otra categoría personalizada...</option>
                </select>

                {formCategory === "Otra" && (
                  <input
                    type="text"
                    placeholder="Escribí el nombre de la categoría personalizada"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                )}
                {formErrors.category && <p className="text-red-400 text-[10px] mt-1">{formErrors.category}</p>}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                  Descripción o Concepto
                </label>
                <input
                  type="text"
                  placeholder="ej. Setup Landing Lic. Mariana Gómez / Suscripción Supabase"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                {formErrors.description && <p className="text-red-400 text-[10px] mt-1">{formErrors.description}</p>}
              </div>

              {/* Monto, Moneda y Tipo de Cambio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Monto */}
                <div className="sm:col-span-1">
                  <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                  {formErrors.amount && <p className="text-red-400 text-[10px] mt-1">{formErrors.amount}</p>}
                </div>

                {/* Moneda */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    Divisa
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (U$S)</option>
                  </select>
                </div>

                {/* Tipo de Cambio */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    TC (ARS / USD)
                  </label>
                  <input
                    type="number"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  {formErrors.rate && <p className="text-red-400 text-[10px] mt-1">{formErrors.rate}</p>}
                </div>
              </div>

              {/* Recurrencia y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                {/* Recurrencia */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    Recurrencia (Fijo / Var)
                  </label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="unico">Único (Variable)</option>
                    <option value="mensual">Mensual (Fijo Recurrente)</option>
                    <option value="anual">Anual (Fijo Recurrente)</option>
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    Fecha Contable
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Guardar Transacción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
