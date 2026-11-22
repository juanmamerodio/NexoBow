// scripts/autonomous/appointment-reminders.mjs — Seam puro 100% offline para Recordatorios 24h/2h idempotentes y Lista de Espera FIFO Ley 25.326 (Ticket #61)

export const ELIGIBLE_REMINDER_STATUSES = Object.freeze([
  "pendiente",
  "confirmado",
]);

export const REMINDER_WINDOW_MINUTES = Object.freeze({
  "24h": 24 * 60,
  "2h": 2 * 60,
});

export const DEFAULT_WINDOW_MINUTES = 30;
export const DEFAULT_OFFER_TTL_MINUTES = 45;
export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

function toTimestampMs(value, fallback = Date.now()) {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatArgentineSlot(scheduledAt, timezone = DEFAULT_TIMEZONE) {
  const ts = toTimestampMs(scheduledAt, NaN);
  if (!Number.isFinite(ts)) {
    return { dateText: "próximo día", timeText: "horario acordado" };
  }
  const dateObj = new Date(ts);
  const dateText = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dateObj);
  const timeText = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dateObj);
  return { dateText, timeText };
}

function buildInteractiveButtonsPayload({ to, bodyText, buttons }) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    ...(to ? { to: String(to) } : {}),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((btn) => ({
          type: "reply",
          reply: {
            id: btn.id,
            title: btn.title,
          },
        })),
      },
    },
  };
}

/**
 * Selecciona turnos pendientes o confirmados dentro de las ventanas 24h y 2h,
 * respetando confirmed_24h / confirmed_2h y excluyendo registros previos en reminder_dispatches.
 */
export function selectDueReminders(
  appointments = [],
  {
    now = new Date(),
    windowMinutes = DEFAULT_WINDOW_MINUTES,
    dispatches,
    reminderDispatches,
  } = {}
) {
  if (!Array.isArray(appointments)) return [];

  const nowMs = toTimestampMs(now);
  const toleranceMin =
    typeof windowMinutes === "number" && Number.isFinite(windowMinutes) && windowMinutes >= 0
      ? windowMinutes
      : DEFAULT_WINDOW_MINUTES;

  const existingDispatches = Array.isArray(dispatches)
    ? dispatches
    : Array.isArray(reminderDispatches)
      ? reminderDispatches
      : [];

  const sentKeys = new Set();
  for (const row of existingDispatches) {
    if (!row || !row.appointment_id || !row.reminder_type) continue;
    if (String(row.status || "").toLowerCase() === "fallido") continue;
    sentKeys.add(`${row.appointment_id}:${row.reminder_type}`);
  }

  const due = [];

  for (const app of appointments) {
    if (!app || typeof app !== "object" || !app.id) continue;
    if (!ELIGIBLE_REMINDER_STATUSES.includes(app.status)) continue;
    if (app.opted_out === true) continue;

    const scheduledMs = toTimestampMs(app.scheduled_at, NaN);
    if (!Number.isFinite(scheduledMs)) continue;

    const diffMinutes = (scheduledMs - nowMs) / 60000;
    if (diffMinutes <= 0) continue;

    if (
      app.confirmed_2h !== true &&
      Math.abs(diffMinutes - REMINDER_WINDOW_MINUTES["2h"]) <= toleranceMin &&
      !sentKeys.has(`${app.id}:2h`)
    ) {
      due.push({
        appointmentId: app.id,
        clientSlug: app.client_slug || null,
        reminderType: "2h",
        scheduledAt: app.scheduled_at,
        minutesUntilAppointment: Math.round(diffMinutes),
        appointment: structuredClone(app),
      });
    }

    if (
      app.confirmed_24h !== true &&
      Math.abs(diffMinutes - REMINDER_WINDOW_MINUTES["24h"]) <= toleranceMin &&
      !sentKeys.has(`${app.id}:24h`)
    ) {
      due.push({
        appointmentId: app.id,
        clientSlug: app.client_slug || null,
        reminderType: "24h",
        scheduledAt: app.scheduled_at,
        minutesUntilAppointment: Math.round(diffMinutes),
        appointment: structuredClone(app),
      });
    }
  }

  due.sort((a, b) => {
    const diff = toTimestampMs(a.scheduledAt) - toTimestampMs(b.scheduledAt);
    if (diff !== 0) return diff;
    if (a.reminderType !== b.reminderType) {
      return a.reminderType === "2h" ? -1 : 1;
    }
    return String(a.appointmentId).localeCompare(String(b.appointmentId));
  });

  return due;
}

/**
 * Redacta el recordatorio de turno (24h o 2h) en voseo argentino +40 sobrio
 * con botones interactivos [Confirmar turno] y [Reprogramar].
 */
export function buildReminderDispatchMessage({
  appointment,
  reminderType = "24h",
  providerName = "nuestro consultorio",
  timezone = DEFAULT_TIMEZONE,
} = {}) {
  if (reminderType !== "24h" && reminderType !== "2h") {
    throw new RangeError(`Tipo de recordatorio inválido: ${String(reminderType)}`);
  }
  if (!appointment || typeof appointment !== "object") {
    throw new TypeError("Se requiere el objeto appointment para construir el recordatorio.");
  }

  const firstName = String(appointment.patient_first_name || "").trim();
  const greeting = firstName ? `Hola ${firstName}, ¿cómo estás?` : "Hola, ¿cómo estás?";
  const cleanProvider = String(providerName || "nuestro consultorio").trim();
  const specialty = String(appointment.specialty || "").trim();
  const specialtyText = specialty ? ` (${specialty})` : "";
  const { dateText, timeText } = formatArgentineSlot(appointment.scheduled_at, timezone);

  const bodyText =
    reminderType === "24h"
      ? `${greeting} Te recordamos tu turno con ${cleanProvider}${specialtyText} para el ${dateText} a las ${timeText} hs. ` +
        `Confirmá tu asistencia con el botón correspondiente o avisanos si necesitás reprogramar para organizar la agenda. ` +
        `Si preferís no recibir estos avisos, respondé "baja".`
      : `${greeting} En aproximadamente dos horas tenés tu turno con ${cleanProvider}${specialtyText} (${timeText} hs). ` +
        `Si surge algún imprevisto y no podés acercarte, por favor avisanos cuanto antes para reorganizar el horario. ` +
        `Si preferís no recibir avisos, respondé "baja".`;

  const buttons = [
    { id: `confirmar_${reminderType}_${appointment.id}`, title: "Confirmar turno" },
    { id: `reprogramar_${reminderType}_${appointment.id}`, title: "Reprogramar" },
  ];

  return {
    appointmentId: appointment.id,
    clientSlug: appointment.client_slug || null,
    reminderType,
    text: bodyText,
    buttons,
    wabaPayload: buildInteractiveButtonsPayload({
      to: appointment.patient_phone_e164 || "",
      bodyText,
      buttons,
    }),
  };
}

function buildWaitlistOfferPayload({
  candidate,
  appointmentId,
  clientSlug,
  specialty,
  scheduledAt,
  offerExpiresAt,
  offerTtlMinutes,
  timezone = DEFAULT_TIMEZONE,
}) {
  const firstName = String(candidate.patient_first_name || "").trim();
  const greeting = firstName ? `Hola ${firstName}, ¿cómo estás?` : "Hola, ¿cómo estás?";
  const { dateText, timeText } = formatArgentineSlot(scheduledAt, timezone);
  const specialtyLabel = specialty ? ` de ${specialty}` : "";

  const messageText =
    `${greeting} Se liberó un turno${specialtyLabel} para el ${dateText} a las ${timeText} hs. ` +
    `Como estás en la lista de espera, te reservamos la prioridad durante los próximos ${offerTtlMinutes} minutos. ` +
    `Respondé si querés tomarlo; si no recibimos respuesta antes del vencimiento, pasamos el lugar al siguiente paciente. ` +
    `Para salir de la lista, respondé "baja".`;

  const buttons = [
    { id: `tomar_waitlist_${appointmentId}`, title: "Confirmar turno" },
    { id: `declinar_waitlist_${appointmentId}`, title: "Pasar al siguiente" },
  ];

  return {
    waitlistEntryId: candidate.id,
    appointmentId,
    clientSlug,
    patientFirstName: firstName || null,
    patientPhoneHash: candidate.patient_phone_hash,
    offeredSlotId: appointmentId,
    scheduledAt: scheduledAt || null,
    offerExpiresAt,
    messageText,
    buttons,
    wabaPayload: buildInteractiveButtonsPayload({
      to: candidate.patient_phone_e164 || "",
      bodyText: messageText,
      buttons,
    }),
  };
}

function findNextEligibleWaitlistIndex(
  queue,
  { clientSlug, specialty = null, excludePhoneHash = null } = {}
) {
  const candidates = [];

  for (let idx = 0; idx < queue.length; idx++) {
    const entry = queue[idx];
    if (!entry || typeof entry !== "object") continue;
    if (entry.status !== "esperando") continue;
    if (entry.consent_waitlist !== true) continue;
    if (entry.opted_out === true) continue;
    if (clientSlug && entry.client_slug !== clientSlug) continue;
    if (specialty && entry.specialty && entry.specialty !== specialty) continue;
    if (excludePhoneHash && entry.patient_phone_hash === excludePhoneHash) continue;

    candidates.push({
      idx,
      createdMs: toTimestampMs(entry.created_at, Number.MAX_SAFE_INTEGER),
    });
  }

  if (candidates.length === 0) return -1;

  candidates.sort((a, b) => {
    if (a.createdMs !== b.createdMs) return a.createdMs - b.createdMs;
    return a.idx - b.idx;
  });

  return candidates[0].idx;
}

function normalizeOfferTtlMinutes(offerTtlMinutes) {
  return typeof offerTtlMinutes === "number" &&
    Number.isFinite(offerTtlMinutes) &&
    offerTtlMinutes > 0
    ? Math.round(offerTtlMinutes)
    : DEFAULT_OFFER_TTL_MINUTES;
}

/**
 * Procesa la respuesta del paciente ("confirmar", "reprogramar" o "cancelar").
 * Ante cancelación/reprogramación libera el hueco y oferta en estricto orden FIFO
 * exclusivamente a pacientes con consent_waitlist === true && opted_out !== true.
 */
export function processPatientAppointmentResponse({
  appointment,
  action,
  reminderType = "24h",
  waitlistQueue = [],
  now = new Date(),
  offerTtlMinutes = DEFAULT_OFFER_TTL_MINUTES,
  timezone = DEFAULT_TIMEZONE,
} = {}) {
  if (!appointment || typeof appointment !== "object") {
    throw new TypeError("Se requiere appointment para procesar la respuesta.");
  }

  const normalizedAction = String(action || "").trim().toLowerCase();
  if (
    normalizedAction !== "confirmar" &&
    normalizedAction !== "reprogramar" &&
    normalizedAction !== "cancelar"
  ) {
    throw new RangeError(`Acción de turno inválida: ${String(action)}`);
  }

  const nowMs = toTimestampMs(now);
  const nowIso = new Date(nowMs).toISOString();
  const ttlMin = normalizeOfferTtlMinutes(offerTtlMinutes);

  const updatedAppointment = structuredClone(appointment);
  const updatedWaitlistQueue = Array.isArray(waitlistQueue)
    ? waitlistQueue.map((item) => structuredClone(item))
    : [];

  if (normalizedAction === "confirmar") {
    updatedAppointment.status = "confirmado";
    if (reminderType === "2h") {
      updatedAppointment.confirmed_2h = true;
    } else {
      updatedAppointment.confirmed_24h = true;
    }
    updatedAppointment.updated_at = nowIso;

    return {
      action: normalizedAction,
      updatedAppointment,
      cancelEscalation: true,
      releasedSlot: null,
      waitlistOffer: null,
      updatedWaitlistQueue,
      telemetryEvent: {
        client_slug: updatedAppointment.client_slug || null,
        event_type: "appointment_confirmed",
        count_delta: 1,
      },
    };
  }

  updatedAppointment.status =
    normalizedAction === "cancelar" ? "cancelado" : "reprogramado";
  updatedAppointment.updated_at = nowIso;

  const releasedSlot = {
    appointmentId: updatedAppointment.id,
    clientSlug: updatedAppointment.client_slug || null,
    specialty: updatedAppointment.specialty || null,
    scheduledAt: updatedAppointment.scheduled_at || null,
    releasedAt: nowIso,
    reason: normalizedAction,
  };

  const nextIdx = findNextEligibleWaitlistIndex(updatedWaitlistQueue, {
    clientSlug: updatedAppointment.client_slug,
    specialty: updatedAppointment.specialty || null,
    excludePhoneHash: updatedAppointment.patient_phone_hash || null,
  });

  let waitlistOffer = null;
  if (nextIdx !== -1) {
    const offerExpiresAt = new Date(nowMs + ttlMin * 60000).toISOString();
    const candidate = updatedWaitlistQueue[nextIdx];
    candidate.status = "ofertado";
    candidate.offered_slot_id = updatedAppointment.id;
    candidate.offered_scheduled_at = updatedAppointment.scheduled_at || null;
    candidate.offer_expires_at = offerExpiresAt;
    candidate.updated_at = nowIso;

    waitlistOffer = buildWaitlistOfferPayload({
      candidate,
      appointmentId: updatedAppointment.id,
      clientSlug: updatedAppointment.client_slug || null,
      specialty: updatedAppointment.specialty || null,
      scheduledAt: updatedAppointment.scheduled_at || null,
      offerExpiresAt,
      offerTtlMinutes: ttlMin,
      timezone,
    });
  }

  return {
    action: normalizedAction,
    updatedAppointment,
    cancelEscalation: false,
    releasedSlot,
    waitlistOffer,
    updatedWaitlistQueue,
    telemetryEvent: {
      client_slug: updatedAppointment.client_slug || null,
      event_type:
        normalizedAction === "cancelar"
          ? "appointment_cancelled"
          : "appointment_rescheduled",
      count_delta: 1,
    },
  };
}

/**
 * Expira ofertas de lista de espera vencidas (offer_expires_at <= now)
 * y promueve automáticamente al siguiente candidato FIFO con consentimiento Ley 25.326.
 */
export function advanceExpiredWaitlistOffers({
  waitlistQueue = [],
  now = new Date(),
  offerTtlMinutes = DEFAULT_OFFER_TTL_MINUTES,
  timezone = DEFAULT_TIMEZONE,
} = {}) {
  const nowMs = toTimestampMs(now);
  const nowIso = new Date(nowMs).toISOString();
  const ttlMin = normalizeOfferTtlMinutes(offerTtlMinutes);

  const updatedWaitlistQueue = Array.isArray(waitlistQueue)
    ? waitlistQueue.map((item) => structuredClone(item))
    : [];

  const expiredTargets = [];
  for (let i = 0; i < updatedWaitlistQueue.length; i++) {
    const entry = updatedWaitlistQueue[i];
    if (!entry || entry.status !== "ofertado") continue;
    const expMs = toTimestampMs(entry.offer_expires_at, NaN);
    if (!Number.isFinite(expMs) || expMs > nowMs) continue;
    expiredTargets.push({ index: i, expMs, createdMs: toTimestampMs(entry.created_at, 0) });
  }

  expiredTargets.sort((a, b) => {
    if (a.expMs !== b.expMs) return a.expMs - b.expMs;
    if (a.createdMs !== b.createdMs) return a.createdMs - b.createdMs;
    return a.index - b.index;
  });

  const expiredOffers = [];
  for (const target of expiredTargets) {
    const entry = updatedWaitlistQueue[target.index];
    entry.status = "expirado";
    entry.updated_at = nowIso;
    expiredOffers.push(structuredClone(entry));
  }

  const promotedOffers = [];
  const unfilledSlots = [];

  for (const expired of expiredOffers) {
    const nextIdx = findNextEligibleWaitlistIndex(updatedWaitlistQueue, {
      clientSlug: expired.client_slug,
      specialty: expired.specialty || null,
      excludePhoneHash: expired.patient_phone_hash || null,
    });

    if (nextIdx === -1) {
      unfilledSlots.push({
        appointmentId: expired.offered_slot_id || null,
        clientSlug: expired.client_slug || null,
        specialty: expired.specialty || null,
        expiredEntryId: expired.id,
      });
      continue;
    }

    const offerExpiresAt = new Date(nowMs + ttlMin * 60000).toISOString();
    const nextCandidate = updatedWaitlistQueue[nextIdx];
    nextCandidate.status = "ofertado";
    nextCandidate.offered_slot_id = expired.offered_slot_id || null;
    nextCandidate.offered_scheduled_at = expired.offered_scheduled_at || null;
    nextCandidate.offer_expires_at = offerExpiresAt;
    nextCandidate.updated_at = nowIso;

    promotedOffers.push(
      buildWaitlistOfferPayload({
        candidate: nextCandidate,
        appointmentId: expired.offered_slot_id || null,
        clientSlug: nextCandidate.client_slug || null,
        specialty: nextCandidate.specialty || null,
        scheduledAt: expired.offered_scheduled_at || null,
        offerExpiresAt,
        offerTtlMinutes: ttlMin,
        timezone,
      })
    );
  }

  return {
    expiredOffers,
    promotedOffers,
    unfilledSlots,
    updatedWaitlistQueue,
  };
}
