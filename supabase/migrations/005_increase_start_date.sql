-- 005_increase_start_date.sql  ·  ESQUEMA: rental  ·  Proyecto: cfcssfwxdfgqpvyuepjo
-- Fecha en la que entra en vigor, por primera vez, el incremento anual de una propiedad.
-- Idempotente y sin bloques DO.

alter table rental.properties
    add column if not exists increase_start_date date;

-- Refresca la caché de la API para que reconozca la columna nueva.
notify pgrst, 'reload schema';
