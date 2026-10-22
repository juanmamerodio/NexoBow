# 06: Motor de Expiración de 7 Días (Urgencia + Purga Automática) y Mejora Continua (T-SYS-02)

**What to build:** El motor de ciclo de vida que sincroniza estados con Google Sheets, renueva la ventana de 7 días cuando un lead avanza de etapa, emite alertas de seguimiento con link de WhatsApp de urgencia en los días 5–6, y purga automáticamente las fichas y clones cuando supera los 7 días de inactividad o se marca como `"Descartado"` en el Sheet; más el analizador de **Mejora Continua** que procesa KPIs y mensajes del Sheet (`A1:S10` + `B11:S1000`).

**Blocked by:** 05: Alineación Google Sheets a Columna B (B11:S1000) y Correlatividad de Slugs (T-SYS-01)

**Status:** ready-for-agent

- [ ] El evaluador de ciclo de vida detecta leads renovados, leads en alerta (días 5–6) y leads expirados (`>=7 días` o `"Descartado"`), protegiendo siempre `_ficha-template.md` y `demo-*`.
- [ ] El analizador de mejora continua calcula tasas de contacto, respuesta, reuniones y recomendaciones por nicho desde los datos del Sheet.
- [ ] Suite de pruebas de ciclo de vida y mejora continua pasa al 100%.
