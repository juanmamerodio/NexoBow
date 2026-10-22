# 11: Registrar la URL de preview en el Sheet al compilar (Columna G)

**What to build:** Al terminar `build-client-site` para un lead, la fila de ese `sheet_id` queda con la URL exacta `https://preview.nexobow.site/{slug}/` en la **Columna G (`Web Demo URL`)**. La Columna L (`Último Contacto`) no se toca.

**Blocked by:** 08, 09

**Status:** done

- [x] Tras un build exitoso, la celda G de la fila correspondiente contiene la URL oficial.
- [x] Reconstruir el mismo cliente es idempotente (actualiza, no duplica).
- [x] Si el lead no existe en el Sheet, el build termina bien y avisa sin fallar.
- [x] Test con adaptador en memoria verifica G escrita y L intacta.
