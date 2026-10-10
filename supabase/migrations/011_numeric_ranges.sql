-- 011_numeric_ranges.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Corrige "numeric field overflow" al guardar propiedades: amplía las columnas de dinero/medidas
-- que podían ser demasiado estrechas (p. ej. numeric(5,2) no admite un aumento fijo de RD$ 1,000).
-- Ampliar la precisión no cambia ni pierde ningún dato existente. Idempotente (repetirla no hace daño)
-- y sin bloques DO.

alter table rental.properties
    alter column monthly_rent type numeric(14,2),
    alter column annual_increase_pct type numeric(14,2),
    alter column square_meters type numeric(10,2);

alter table rental.rent_payments
    alter column rent_amount type numeric(14,2),
    alter column amount_paid type numeric(14,2),
    alter column remaining_balance type numeric(14,2);

alter table rental.gas_consumption
    alter column total_cost type numeric(14,2);

-- Refresca la caché de la API.
notify pgrst, 'reload schema';
