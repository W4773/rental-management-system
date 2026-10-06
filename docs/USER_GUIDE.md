# Guía de uso · Alquiler Pro

**Español** · [English](USER_GUIDE.en.md) · [← Volver al README](../README.md)

Esta guía recorre la app pantalla por pantalla. Las capturas usan datos de demostración ficticios.

## Contenido

1. [Primeros pasos](#1-primeros-pasos)
2. [Edificios](#2-edificios)
3. [Propiedades](#3-propiedades)
4. [Inquilinos](#4-inquilinos)
5. [Registrar pagos](#5-registrar-pagos)
6. [Corregir el historial: editar meses](#6-corregir-el-historial-editar-meses)
7. [Servicios: gas, luz y agua](#7-servicios-gas-luz-y-agua)
8. [Recibos y reportes en PDF](#8-recibos-y-reportes-en-pdf)
9. [Buscar y filtrar](#9-buscar-y-filtrar)
10. [Alertas y registro de actividad](#10-alertas-y-registro-de-actividad)
11. [Equipo](#11-equipo)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. Primeros pasos

1. Crea tu cuenta en **Registro** e inicia sesión.
2. Ve a **Ajustes → Factura** (icono de engranaje) y completa: nombre del negocio, nombre del arrendador, teléfono, correo, pie de factura y tu **firma**. Estos datos aparecen en todos tus PDFs.
3. Navega con las pestañas del encabezado: **Inicio · Propiedades · Edificios · Inquilinos · Gastos**. El logo *Alquiler Pro* siempre te lleva al Inicio.

![Inicio](images/home.png)

El **Inicio** reúne los indicadores del año, la lista de propiedades (agrupadas por edificio) con su estado de pago y el **registro de actividad**. La campana muestra las alertas de pago.

## 2. Edificios

**Edificios → + Nuevo edificio.** Indica nombre y dirección. Desde la misma pantalla puedes:

- **Editar** (lápiz) el nombre o la dirección. Si cambias la dirección, las unidades que tenían la del edificio se actualizan.
- **Eliminar** un edificio: sus propiedades **no se borran**, quedan "Sin edificio".
- **Asignar** propiedades sueltas a un edificio con el selector de la sección "Sin edificio".

Cada tarjeta muestra unidades, ocupación, renta mensual total y cuántas están atrasadas. Pulsa una unidad para abrirla.

![Edificios](images/buildings.png)

## 3. Propiedades

**Propiedades → + Nueva propiedad.** Completa nombre o código, edificio (opcional; si lo eliges, la dirección es opcional), renta mensual, habitaciones y baños. Más abajo encontrarás datos adicionales (tipo, metros, depósito, notas).

**Incremento anual.** Elige porcentaje o monto fijo y, si quieres, la **fecha del primer aumento**: el día en que entra en vigor por primera vez; luego se repite cada año en la misma fecha. En el detalle de la propiedad verás una línea como *"Aumento anual: 5% · próximo el 01/01/2027 → RD$19,425"*. Es informativo: la renta no cambia sola.

Para editar o eliminar una propiedad usa los iconos de la esquina superior derecha de su detalle. Eliminar borra también su historial; la app te pide confirmación.

![Detalle de propiedad](images/properties.png)

## 4. Inquilinos

- **Asignar:** en el detalle de una propiedad vacante pulsa *Asignar inquilino* (o **Inquilinos → + Nuevo inquilino** y elige la propiedad con el buscador). Pide nombre, cédula, teléfono, correo (opcional) y fecha de entrada.
- **Editar** los datos del inquilino actual: botón *Editar inquilino*.
- **Cambiar inquilino:** registra a uno nuevo; el anterior pasa a "Antiguos" con su historial.
- **Desvincular:** botón *Desvincular* (en la propiedad o en Inquilinos). La propiedad queda vacante y el inquilino pasa a **Antiguos**. **No se borra ningún pago.**

La pestaña **Inquilinos** tiene dos vistas: **Activos** (con su estado de pago) y **Antiguos** (histórico con propiedad, período, total pagado y detalle de cada pago, más *Reporte PDF* por inquilino).

![Inquilinos antiguos](images/tenants-former.png)

> Al registrar un inquilino, la app marca como **pagados** los meses anteriores al mes pasado (histórico). Si en realidad ese inquilino llega con atrasos, corrígelo en [Editar meses](#6-corregir-el-historial-editar-meses).

## 5. Registrar pagos

### Un mes

Pulsa **Registrar pago** (Inicio) o **Pagar** (en la propiedad), o toca un mes pendiente del **Estado anual**. Elige la propiedad (con el buscador), el mes, el tipo (*completo* o *parcial*), fecha, método, referencia y notas. Los abonos parciales se acumulan hasta completar la renta del mes.

### Varios meses a la vez

En el detalle de la propiedad, sección **Pagos → Selección múltiple**: marca los meses pendientes (o usa *Marcar meses pendientes*) y pulsa **Pagar N meses**. Se registra el saldo de cada mes en un solo paso.

![Pagar varios meses](images/pay-several-months.png)

### Recibo opcional

Al guardar, la app pregunta **¿Desea imprimir el recibo?** — *Sí, imprimir* descarga el PDF; *Ahora no* continúa sin imprimir. Siempre puedes imprimirlo después desde el historial (icono de impresora).

### Editar o eliminar un pago

En el **Historial de pagos** cada fila tiene tres iconos: **imprimir**, **editar (lápiz)** y **eliminar**. Al editar puedes cambiar monto, fecha, método, referencia y notas; el saldo y el estado del mes se recalculan.

## 6. Corregir el historial: editar meses

Úsalo cuando el historial no refleja la realidad: por ejemplo, un inquilino que registras hoy pero **lleva meses sin pagar**, o meses en los que **no se cobró** porque el apartamento estuvo vacío.

1. En la propiedad, **Pagos → Editar meses** (icono de lápiz). Cambia el año con las flechas si hace falta.
2. Marca los meses que quieres corregir. Atajo: **Todos los meses hasta hoy**.
3. Elige:
   - **Marcar pendiente** — el mes se debe. Cuenta en el estado de pago y en el monto atrasado.
   - **Marcar nulo…** — el mes **no se cobró ni se cobrará**. Indica el motivo (apartamento vacío o desocupado, acuerdo con el propietario, mantenimiento u otro). No cuenta como deuda ni en la tasa de cobro; se ve gris rayado en el Estado anual.
   - **Quitar marca** — devuelve el mes a "sin registro".

![Editar meses](images/properties-edit-months.png)

**Reglas:** los meses con **pagos registrados** están bloqueados (candado): edita o elimina ese pago primero. Los meses de histórico generado automáticamente sí se pueden corregir. Los meses futuros no se editan.

## 7. Servicios: gas, luz y agua

**Gastos** tiene una pestaña por servicio. **+ Registrar lectura** pide propiedad, fecha y lectura actual; la app toma la lectura anterior, calcula el consumo y el costo con la tarifa que indiques. Cada lectura queda *Pendiente* hasta que pulses **Pagar**. En el detalle de cada propiedad también ves sus servicios y el pendiente.

![Gastos](images/expenses.png)

## 8. Recibos y reportes en PDF

- **Recibo:** de un pago, o consolidado de varios (marca pagos en *Selección múltiple* → *Recibo*).
- **Reporte de pagos:** icono de documento en la propiedad, o **Reporte PDF** en un inquilino. Elige el año, el historial completo o los pagos marcados. Incluye datos del inquilino y edificio, total pagado, pendiente y la tabla de pagos.

Ambos usan el nombre del negocio, contacto y firma de **Ajustes → Factura**.

![Reporte PDF](images/report-pdf.png)

## 9. Buscar y filtrar

- En **Inicio** y **Propiedades**: buscador por inquilino o propiedad, filtros **Al día / Pendientes / Atrasados / Vacantes** y por **edificio**.
- Cuando eliges una propiedad en un formulario (pagos, asignar inquilino, servicios, reportes) aparece un **selector con buscador**: escribe parte del nombre, del edificio, de la dirección o del inquilino. Cada opción muestra su edificio e inquilino, así no confundes dos "Apartamento 1-A".

![Selector de propiedad](images/property-picker.png)

## 10. Alertas y registro de actividad

- **Campana** del encabezado: meses vencidos y próximos a vencer; cada alerta tiene *Registrar pago*.
- **Registro de actividad** (Inicio): pagos, ediciones, meses marcados, inquilinos, edificios, servicios, recibos y reportes, con **quién** lo hizo y **cuándo**.

## 11. Equipo

**Ajustes → Equipo** muestra al titular y a los miembros. El titular puede **agregar** una cuenta por correo (debe estar ya registrada en la app) o **quitarla**. Los miembros ven y editan los mismos datos y pueden **salir del equipo**.

![Equipo](images/settings-team.png)

## 12. Preguntas frecuentes

**¿Por qué un inquilino sale "Pendiente" si ya pagó?**
Revisa el mes: se debe el **mes anterior**, no el actual. Registra ese pago o, si no se cobró, márcalo como nulo en [Editar meses](#6-corregir-el-historial-editar-meses).

**¿Se pierde algo al desvincular un inquilino?**
No. Pasa a *Antiguos* con todos sus pagos y puedes sacar su reporte PDF.

**¿Qué diferencia hay entre "pendiente" y "nulo"?**
Pendiente = se debe. Nulo = no se cobró ni se cobrará (no cuenta como deuda).

**¿Por qué no puedo editar un mes?**
Si tiene pagos registrados está bloqueado (candado): edita o elimina el pago desde el historial. Los meses futuros tampoco se editan.

**Veo un aviso que pide ejecutar una migración.**
Esa función necesita una actualización de la base de datos. Pídele al administrador que ejecute el archivo indicado (ver [Base de datos](DATABASE.md)).
