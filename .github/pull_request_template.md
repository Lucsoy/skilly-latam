## Qué cambia
<!-- Describe el cambio y la incidencia o requerimiento relacionado (INC-xx / RF-xx). -->

## Cómo se probó
- [ ] `npm run typecheck` sin errores
- [ ] `npm test` en verde
- [ ] `npm run test:integracion` en verde (si toca la API o la base)
- [ ] Probado en la interfaz (adjunta captura si cambia una pantalla)
- [ ] Si cambia la base: migración idempotente + `comparar_esquemas.py` sin diferencias

## Revisión
- [ ] Sin credenciales, `.env` ni `config.local.php`
- [ ] Mensajes y comentarios en español, explicando el porqué
- Revisor/a asignado/a: @
