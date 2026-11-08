-- 013: plantilla de la carta de notificación de aumento (Ajustes -> Carta de aumento).
-- Mismo formato que letter_settings (008): asunto, texto con variables <<...>> y opciones de diseño en un JSON.
-- Es seguro ejecutarlo más de una vez. Copia el archivo COMPLETO en el SQL Editor de Supabase.

alter table rental.user_settings add column if not exists increase_letter_settings jsonb;

notify pgrst, 'reload schema';
