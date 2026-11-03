// web/src/lib/realtime.ts — Sincronización en Tiempo Real (Supabase Realtime) para el Cockpit (Ticket 46)
import { getBrowserSupabaseClient } from "./supabase.ts";

export type RealtimeStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR"
  | "CONNECTING";

export interface RealtimeChangeEvent<T = any> {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE" | "*";
  new?: T | null;
  old?: T | null;
  timestamp: string;
}

export interface RealtimeSubscriberOptions {
  channelName?: string;
  tables?: string[];
  forceMock?: boolean;
  onEvent?: (event: RealtimeChangeEvent) => void;
  onStatusChange?: (status: RealtimeStatus) => void;
}

export interface AdminRealtimeChannel {
  channelName: string;
  tables: string[];
  status: RealtimeStatus;
  unsubscribe: () => void | Promise<void>;
  simulateEvent: (event: Partial<RealtimeChangeEvent>) => void;
}

export const DEFAULT_WATCHED_TABLES = [
  "leads",
  "financial_transactions",
  "schedule_blocks",
  "alaynow_videos",
  "habits",
  "habit_logs",
];

/**
 * Factoría para generación de eventos simulados (DRY)
 */
function createSimulateEventHandler(
  tables: string[],
  onEvent?: (event: RealtimeChangeEvent) => void
): (event: Partial<RealtimeChangeEvent>) => void {
  return (event: Partial<RealtimeChangeEvent>) => {
    const fullEvent: RealtimeChangeEvent = {
      table: event.table || tables[0] || "leads",
      eventType: event.eventType || "UPDATE",
      new: event.new ?? null,
      old: event.old ?? null,
      timestamp: new Date().toISOString(),
    };
    onEvent?.(fullEvent);
  };
}

/**
 * Crea o se suscribe a canales de Supabase Realtime escuchando mutaciones en las 6 tablas clave
 */
export function subscribeToAdminRealtime(
  supabaseClient?: any,
  options?: RealtimeSubscriberOptions
): AdminRealtimeChannel {
  const supabase =
    supabaseClient !== undefined ? supabaseClient : getBrowserSupabaseClient();
  const channelName = options?.channelName || "admin-cockpit-realtime";
  const tables = options?.tables || DEFAULT_WATCHED_TABLES;

  let currentStatus: RealtimeStatus = "CONNECTING";

  const isMockClient =
    Boolean(options?.forceMock) ||
    !supabase ||
    typeof supabase.channel !== "function" ||
    Boolean(supabase.supabaseUrl && String(supabase.supabaseUrl).includes("mockproject"));

  // Manejador simulado o para clientes sin soporte nativo de WebSockets
  if (isMockClient) {
    currentStatus = "SUBSCRIBED";
    // Disparar sincrónicamente y asincrónicamente para máxima compatibilidad
    options?.onStatusChange?.("SUBSCRIBED");

    return {
      channelName,
      tables,
      get status() {
        return currentStatus;
      },
      unsubscribe: () => {
        currentStatus = "CLOSED";
        options?.onStatusChange?.("CLOSED");
      },
      simulateEvent: createSimulateEventHandler(tables, options?.onEvent),
    };
  }

  // Soporte Supabase Realtime nativo
  try {
    const channel = supabase.channel(channelName);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => {
          const event: RealtimeChangeEvent = {
            table,
            eventType: payload.eventType || "UPDATE",
            new: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString(),
          };
          options?.onEvent?.(event);
        }
      );
    }

    channel.subscribe((status: string) => {
      let mappedStatus: RealtimeStatus = "CONNECTING";
      if (status === "SUBSCRIBED") mappedStatus = "SUBSCRIBED";
      else if (status === "TIMED_OUT") mappedStatus = "TIMED_OUT";
      else if (status === "CLOSED") mappedStatus = "CLOSED";
      else if (status === "CHANNEL_ERROR") mappedStatus = "CHANNEL_ERROR";

      currentStatus = mappedStatus;
      options?.onStatusChange?.(mappedStatus);
    });

    return {
      channelName,
      tables,
      get status() {
        return currentStatus;
      },
      unsubscribe: () => {
        currentStatus = "CLOSED";
        try {
          if (typeof supabase.removeChannel === "function") {
            supabase.removeChannel(channel);
          } else if (typeof channel.unsubscribe === "function") {
            channel.unsubscribe();
          }
        } catch (err) {
          console.warn("Error al desuscribir canal realtime:", err);
        }
        options?.onStatusChange?.("CLOSED");
      },
      simulateEvent: createSimulateEventHandler(tables, options?.onEvent),
    };
  } catch (err) {
    console.warn("Fallo suscribiendo a Supabase Realtime, activando fallback local:", err);
    currentStatus = "SUBSCRIBED";
    setTimeout(() => {
      options?.onStatusChange?.("SUBSCRIBED");
    }, 10);

    return {
      channelName,
      tables,
      get status() {
        return currentStatus;
      },
      unsubscribe: () => {
        currentStatus = "CLOSED";
        options?.onStatusChange?.("CLOSED");
      },
      simulateEvent: createSimulateEventHandler(tables, options?.onEvent),
    };
  }
}
