-- 008: plantilla de la carta de cobro (Ajustes -> Carta de cobro).
-- Guarda el asunto, el texto con variables <<...>> y las opciones de diseño en un solo campo JSON.
-- Es seguro ejecutarlo más de una vez. Copia el archivo COMPLETO en el SQL Editor de Supabase.

alter table rental.user_settings add column if not exists letter_settings jsonb;

notify pgrst, 'reload schema';
