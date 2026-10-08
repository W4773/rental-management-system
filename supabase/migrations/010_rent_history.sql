-- 010: historial de precios por propiedad (rental.properties.rent_history).
-- Guarda los cambios de renta como una lista [{ "from": "YYYY-MM", "rent": 15000 }, ...]. Así, al subir
-- el precio, los meses anteriores sin cobrar conservan el precio que tenían; los pagos ya cobrados no
-- cambian nunca (cada pago guarda su propio rent_amount).
-- Es seguro ejecutarlo más de una vez. Copia el archivo COMPLETO en el SQL Editor de Supabase.

alter table rental.properties add column if not exists rent_history jsonb;

notify pgrst, 'reload schema';
