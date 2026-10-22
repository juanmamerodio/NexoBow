# 10: ID correlativo real desde Columna B y escritura atómica de 18 columnas

**What to build:** Al prospectar, el ID sale del máximo real de la Columna B (no de estimar filas/2), se verifica que siga libre justo antes de escribir y la fila completa de 18 columnas (B→S) se escribe en una sola operación con teléfono normalizado, link de WhatsApp y URL de preview.

**Blocked by:** 09

**Status:** done

- [x] El ID siguiente = máx(Col B) + 1, también con filas sin nombre o teléfono.
- [x] Si el ID fue tomado entre lectura y escritura, el flujo recalcula o aborta sin sobrescribir.
- [x] Una sola operación de append escribe las 18 columnas, con escape correcto de comas y comillas.
- [x] Teléfono normalizado disponible como dato propio de la fila, no solo dentro del link `wa.me`.
- [x] Tests deterministas contra el adaptador en memoria, incluida la colisión de ID.
