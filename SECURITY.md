# Seguridad · Security Policy

**Español** · [English](#english)

## Reporte de vulnerabilidades

Si encuentras una vulnerabilidad en Alquiler Pro, **no abras un issue público**. Escríbenos a
[optimard@innovaflowtech.com](mailto:optimard@innovaflowtech.com) con una descripción, los pasos para reproducirla y el impacto
que crees que tiene. Responderemos lo antes posible y te mantendremos informado de la corrección.

## Buenas prácticas para quienes despliegan la app

- Usa únicamente la `anon key` de Supabase en el front; **nunca** la `service_role`.
- Mantén **Row Level Security** activo en todas las tablas del esquema `rental`.
- No subas respaldos, exportaciones ni capturas con datos reales de clientes al repositorio.
- Rota inmediatamente cualquier clave que se haya expuesto por error.

---

<a id="english"></a>

## Reporting a vulnerability

If you find a vulnerability in Alquiler Pro, **do not open a public issue**. Email
[optimard@innovaflowtech.com](mailto:optimard@innovaflowtech.com) with a description, steps to reproduce and the impact you
believe it has. We will reply as soon as possible and keep you informed about the fix.

## Good practices for people deploying the app

- Only use Supabase's `anon key` in the front end; **never** the `service_role` key.
- Keep **Row Level Security** enabled on every table in the `rental` schema.
- Do not commit backups, exports or screenshots containing real customer data.
- Rotate any key that was exposed by mistake immediately.
