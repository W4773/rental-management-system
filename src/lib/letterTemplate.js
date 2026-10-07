import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PDF_COLORS, money, dateLabel, drawWatermark } from './pdfHelpers'
import { normalizeText, monthKeyOf, hasMoney } from './paymentStatus'
import { loadImageAsDataUrl } from './pdfGenerator'

/** Variables the user can drop in the letter as <<Name>>; matching ignores case and accents. */
export const LETTER_VARIABLES = [
    ['Nombre del inquilino', 'Nombre completo del inquilino'],
    ['Cédula', 'Cédula del inquilino'],
    ['Propiedad', 'Nombre o código de la propiedad'],
    ['Edificio', 'Edificio donde está la propiedad'],
    ['Dirección', 'Dirección de la propiedad'],
    ['Meses pendientes', 'Cantidad de meses vencidos sin pagar'],
    ['Detalle de meses', 'Los meses adeudados, p. ej. "julio, agosto y septiembre de 2026"'],
    ['Monto adeudado', 'Total vencido en RD$'],
    ['Renta mensual', 'Renta mensual de la propiedad'],
    ['Fecha', 'Fecha de hoy'],
    ['Fecha límite', 'Fecha de hoy + 5 días para ponerse al día'],
    ['Nombre del propietario', 'Tu nombre (Ajustes → Factura)'],
    ['Empresa', 'Nombre de tu negocio (Ajustes → Factura)'],
    ['Teléfono', 'Tu teléfono (Ajustes → Factura)'],
    ['Correo', 'Tu correo (Ajustes → Factura)']
]

const FORMAL_BODY = `Estimado(a) <<Nombre del inquilino>>:

Por medio de la presente, nos dirigimos a usted en relación con el alquiler de la propiedad <<Propiedad>> (<<Edificio>>), ubicada en <<Dirección>>.

Según nuestros registros, a la fecha usted presenta <<Meses pendientes>> mes(es) pendiente(s) de pago: <<Detalle de meses>>, por un monto total de <<Monto adeudado>>.

Le solicitamos regularizar su situación a más tardar el <<Fecha límite>>. Si ya realizó el pago, le agradecemos hacernos llegar el comprobante para actualizar nuestros registros.

Quedamos a su disposición para cualquier aclaración al <<Teléfono>> o al correo <<Correo>>.

Atentamente,`

const CORDIAL_BODY = `Hola <<Nombre del inquilino>>:

Esperamos que se encuentre muy bien. Le escribimos para recordarle amablemente que, en nuestros registros, el alquiler de <<Propiedad>> tiene <<Meses pendientes>> mes(es) pendiente(s): <<Detalle de meses>>, que suman <<Monto adeudado>>.

Le agradeceríamos ponerse al día antes del <<Fecha límite>>. Si hay alguna situación que debamos conocer o ya realizó el pago, escríbanos al <<Teléfono>> y con gusto lo resolvemos.

Gracias por su atención y por ser parte de <<Empresa>>.

Cordialmente,`

export const LETTER_PRESETS = {
    formal: { label: 'Formal', subject: 'Aviso de pagos pendientes de alquiler', body: FORMAL_BODY },
    cordial: { label: 'Cordial', subject: 'Recordatorio de alquiler pendiente', body: CORDIAL_BODY }
}

export const DEFAULT_LETTER = {
    preset: 'formal',
    subject: LETTER_PRESETS.formal.subject,
    body: LETTER_PRESETS.formal.body,
    letterhead: true,
    showTable: true,
    showSignature: true
}

/** Saved settings merged over the defaults (older/partial values never break the letter). */
export const resolveLetterSettings = (saved) => ({ ...DEFAULT_LETTER, ...(saved || {}) })

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** ['2026-07','2026-08','2026-09'] -> 'julio, agosto y septiembre de 2026' */
export function describeMonths(keys = []) {
    if (keys.length === 0) return ''
    const label = (k, withYear) => `${MONTHS[parseInt(k.slice(5, 7), 10) - 1]}${withYear ? ` de ${k.slice(0, 4)}` : ''}`
    const sameYear = keys.every(k => k.slice(0, 4) === keys[0].slice(0, 4))
    const parts = keys.map((k, i) => label(k, !sameYear || i === keys.length - 1))
    if (parts.length === 1) return parts[0]
    return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

const longDate = (d) => format(d, "d 'de' MMMM 'de' yyyy", { locale: es })

/** Values for every variable, from one tenant's current situation. */
export function buildLetterValues({ property, tenant, building, status, settings = {}, today = new Date() }) {
    const ownerName = settings.display_name || settings.landlord_name || 'Alquiler Pro'
    return {
        'Nombre del inquilino': tenant?.name || '',
        'Cédula': tenant?.identity_number || '',
        'Propiedad': property?.name || '',
        'Edificio': building?.name || 'sin edificio',
        'Dirección': building?.address || property?.address || '',
        'Meses pendientes': String(status?.monthsOwed ?? 0),
        'Detalle de meses': describeMonths(status?.overdueMonths),
        'Monto adeudado': money(status?.owedAmount),
        'Renta mensual': money(property?.monthly_rent),
        'Fecha': longDate(today),
        'Fecha límite': longDate(addDays(today, 5)),
        'Nombre del propietario': ownerName,
        'Empresa': settings.business_name || ownerName,
        'Teléfono': settings.phone || '',
        'Correo': settings.email || ''
    }
}

/** Replaces <<Variable>> (case/accent-insensitive); unknown variables are left untouched so typos are visible. */
export function renderTemplate(text = '', values = {}) {
    const lookup = {}
    Object.entries(values).forEach(([k, v]) => { lookup[normalizeText(k)] = v })
    return text.replace(/<<\s*([^<>]+?)\s*>>/g, (full, name) => {
        const v = lookup[normalizeText(name)]
        return v === undefined ? full : v
    })
}

/** Sample data for the live preview in Ajustes. */
export const SAMPLE_LETTER_INPUT = () => ({
    property: { name: 'APARTAMENTO 3-B', monthly_rent: 16000, address: 'Av. Duarte #112, Santo Domingo' },
    tenant: { name: 'Juan García López', identity_number: '001-1234567-8' },
    building: { name: 'Torre Duarte', address: 'Av. Duarte #112, Santo Domingo' },
    status: { monthsOwed: 3, overdueMonths: ['2026-07', '2026-08', '2026-09'], owedAmount: 48000 }
})

/** Per-month breakdown (rent minus what was paid) for the small table in the letter. */
export function owedRows({ property, tenant, payments = [], status }) {
    return (status?.overdueMonths || []).map(key => {
        const rows = payments.filter(p => p.tenant_id === tenant?.id && monthKeyOf(p) === key && hasMoney(p))
        const rent = parseFloat(rows[0]?.rent_amount) || parseFloat(property?.monthly_rent) || 0
        const paid = rows.reduce((s, p) => s + (parseFloat(p.amount_paid) || 0), 0)
        const [y, m] = key.split('-').map(Number)
        return [`${MONTHS[m - 1]} ${y}`, money(rent), money(paid), money(Math.max(0, rent - paid))]
    })
}

/** Builds the letter PDF. Returns the jsPDF document (caller saves or previews). */
export async function generateCollectionLetter({ property, tenant, building, status, payments = [], userSettings = {}, letter, today = new Date() }) {
    const cfg = resolveLetterSettings(letter)
    const values = buildLetterValues({ property, tenant, building, status, settings: userSettings, today })
    const doc = new jsPDF()
    const w = doc.internal.pageSize.getWidth()
    const margin = 22
    let y = 24
    const ownerName = values['Nombre del propietario']

    // Watermark first so it stays behind the text
    drawWatermark(doc, ownerName)

    if (cfg.letterhead) {
        doc.setFillColor(...PDF_COLORS.brand)
        doc.rect(0, 0, w, 30, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text(ownerName, margin, 14)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const contact = [userSettings.phone, userSettings.email].filter(Boolean).join('  ·  ')
        doc.text(contact || 'Gestión de alquileres', margin, 21)
        y = 46
    }

    doc.setTextColor(...PDF_COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(values['Fecha'], w - margin, y, { align: 'right' })
    y += 12

    doc.setTextColor(...PDF_COLORS.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(values['Nombre del inquilino'], margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text([values['Propiedad'], values['Dirección']].filter(Boolean).join(' · '), margin, y + 5, { maxWidth: w - margin * 2 })
    y += 16

    doc.setTextColor(...PDF_COLORS.brand)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    const subject = renderTemplate(cfg.subject, values)
    const subjectLines = doc.splitTextToSize(`Asunto: ${subject}`, w - margin * 2)
    doc.text(subjectLines, margin, y)
    y += subjectLines.length * 6 + 2
    doc.setDrawColor(...PDF_COLORS.brand)
    doc.setLineWidth(0.6)
    doc.line(margin, y, margin + 40, y)
    y += 9

    doc.setTextColor(...PDF_COLORS.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    const paragraphs = renderTemplate(cfg.body, values).split('\n')
    // A short last line ("Atentamente,") is the closing: it goes after the table, right above the signature
    let closing = ''
    while (paragraphs.length && paragraphs[paragraphs.length - 1].trim() === '') paragraphs.pop()
    if (paragraphs.length > 1 && paragraphs[paragraphs.length - 1].trim().length <= 40) closing = paragraphs.pop().trim()
    const writeParagraph = (paragraph) => {
        if (paragraph.trim() === '') { y += 2; return }
        const lines = doc.splitTextToSize(paragraph, w - margin * 2)
        if (y + lines.length * 5.2 > 268) { doc.addPage(); y = 24 }
        doc.text(lines, margin, y, { lineHeightFactor: 1.3 })
        y += lines.length * 5.2 + 2.5
    }
    paragraphs.forEach(writeParagraph)

    if (cfg.showTable && (status?.overdueMonths || []).length > 0) {
        y += 2
        if (y > 215) { doc.addPage(); y = 24 }
        autoTable(doc, {
            startY: y,
            head: [['Mes', 'Renta', 'Pagado', 'Pendiente']],
            body: owedRows({ property, tenant, payments, status }),
            foot: [['Total adeudado', '', '', values['Monto adeudado']]],
            theme: 'grid',
            styles: { fontSize: 9.5, cellPadding: 2.4, textColor: PDF_COLORS.ink, lineColor: [225, 220, 205] },
            headStyles: { fillColor: PDF_COLORS.brand, textColor: 255 },
            footStyles: { fillColor: PDF_COLORS.brandLight, textColor: PDF_COLORS.ink, fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: margin, right: margin }
        })
        y = doc.lastAutoTable.finalY + 8
    }

    if (closing) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...PDF_COLORS.ink); writeParagraph(closing) }

    if (y > 245) { doc.addPage(); y = 30 }
    if (cfg.showSignature) {
        if (userSettings.signature_url) {
            const data = await loadImageAsDataUrl(userSettings.signature_url)
            if (data) { doc.addImage(data, /^data:image\/jpe?g/i.test(data) ? 'JPEG' : 'PNG', margin, y, 48, 19); y += 20 }
        } else { y += 14 }
        doc.setDrawColor(...PDF_COLORS.ink)
        doc.setLineWidth(0.4)
        doc.line(margin, y, margin + 62, y)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...PDF_COLORS.ink)
        doc.text(ownerName, margin, y + 5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...PDF_COLORS.muted)
        doc.text(userSettings.business_name && userSettings.business_name !== ownerName ? userSettings.business_name : 'Arrendador', margin, y + 10)
    }

    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(`Carta generada el ${dateLabel(today.toISOString().slice(0, 10))}`, w / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
    return doc
}

export const letterFileName = (tenant) => `Carta-cobro-${(tenant?.name || 'inquilino').replace(/[^\p{L}\p{N}]+/gu, '-')}.pdf`
