import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import Header from '../components/Common/Header'

export default function ReceiptPreview() {
    const { paymentId } = useParams()
    const navigate = useNavigate()
    const [payment, setPayment] = useState(null)
    const [property, setProperty] = useState(null)
    const [tenant, setTenant] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const receiptRef = useRef(null)

    const handleRetry = () => {
        setLoading(true)
        setError(null)
        // Force small delay
        setTimeout(() => fetchReceiptData(), 500)
    }

    async function fetchReceiptData() {
        try {
            setLoading(true)
            // 1. Fetch Payment (Explicit columns to avoid schema cache wildcard issues)
            const { data: paymentData, error: paymentError } = await supabase
                .from('rent_payments') // Fixed table name
                .select('id, amount_paid, payment_date, payment_month, remaining_balance, property_id, tenant_id')
                .eq('id', paymentId)
                .single()

            if (paymentError) throw paymentError
            if (!paymentData) throw new Error('Pago no encontrado')

            setPayment(paymentData)

            // 2. Fetch Property
            const { data: propertyData, error: propError } = await supabase
                .from('properties')
                .select('name, address')
                .eq('id', paymentData.property_id)
                .single()

            if (propError) console.warn("Property fetch error", propError)
            setProperty(propertyData || { name: 'Desconocido', address: '' })

            // 3. Fetch Tenant
            const { data: tenantData, error: tenantError } = await supabase
                .from('tenants')
                .select('name, identity_number, email, phone')
                .eq('id', paymentData.tenant_id)
                .single()

            if (tenantError) console.warn("Tenant fetch error", tenantError)
            setTenant(tenantData || { name: 'Desconocido', email: '', phone: '' })

        } catch (err) {
            console.error('Error fetching receipt data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (paymentId) {
            fetchReceiptData()
        }
    }, [paymentId])

    const handleDownloadPDF = async () => {
        if (!receiptRef.current) return

        try {
            // Show loading indicator
            const loadingMsg = document.createElement('div')
            loadingMsg.id = 'pdf-loading'
            loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e293b;color:white;padding:20px 40px;border-radius:10px;z-index:9999;font-size:16px;box-shadow:0 4px 6px rgba(0,0,0,0.3);'
            loadingMsg.innerHTML = '⏳ Generando PDF, por favor espere...'
            document.body.appendChild(loadingMsg)

            // Give time for DOM to stabilize
            await new Promise(resolve => setTimeout(resolve, 150))

            // Capture with html2canvas - enhanced settings
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff',
                allowTaint: false,
                imageTimeout: 15000
            })

            // Wait for canvas processing to complete
            await new Promise(resolve => setTimeout(resolve, 250))

            // Convert to image data
            const imgData = canvas.toDataURL('image/jpeg', 0.8)

            // Create PDF
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            if (isNaN(pdfHeight) || pdfHeight <= 0) {
                throw new Error("Dimensiones del recibo inválidas")
            }

            // Add image to PDF
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)

            // Give jsPDF time to process the image
            await new Promise(resolve => setTimeout(resolve, 350))

            // Construct filename
            const propName = property?.name || 'Propiedad'
            const tenantName = tenant?.name || 'Inquilino'
            const monthStr = format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es })
            const cleanName = `${propName} - ${tenantName} - ${monthStr}`.replace(/[\/\\?%*:|"<>]/g, '-')
            const fileName = `${cleanName}.pdf`

            // Use blob instead of Data URI (more reliable for large files)
            const pdfBlob = pdf.output('blob')
            const pdfUrl = URL.createObjectURL(pdfBlob)

            // Remove loading indicator
            document.body.removeChild(loadingMsg)

            // Open blob URL directly in new tab
            // The browser will use its native PDF viewer
            window.open(pdfUrl, '_blank')

            // Note: We keep the URL alive so user can download
            // Browser will clean it up when tab closes

            return true
        } catch (err) {
            // Remove loading indicator if exists
            const loadingMsg = document.getElementById('pdf-loading')
            if (loadingMsg) document.body.removeChild(loadingMsg)

            console.error('Error generating PDF:', err)
            alert('Error al generar PDF: ' + err.message)
            return false
        }
    }

    /* 
       Updated Email Handler:
       Since files CANNOT be attached via mailto automatically, we must instruct the user.
    */
    const handleEmail = async () => {
        // 1. Trigger download first so the user HAS the file
        const downloadSuccess = await handleDownloadPDF()
        if (!downloadSuccess) return

        // 2. Open email client
        const subject = `Recibo de Pago - ${property.name} - ${format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es })}`
        const body = `Estimado/a ${tenant.name},%0D%0A%0D%0AAdjunto encontrará el recibo de pago correspondiente a:%0D%0A%0D%0APropiedad: ${property.name}%0D%0AMes: ${format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es })}%0D%0AMonto: RD$ ${payment.amount_paid?.toLocaleString()}%0D%0A%0D%0APor favor verifique el documento PDF adjunto que acabo de descargar.%0D%0A%0D%0ASaludos cordiales.`

        window.location.href = `mailto:${tenant.email || ''}?subject=${subject}&body=${body}`

        // 3. Notify user
        alert('ℹ️ IMPORTANTE: Se ha descargado el recibo PDF y se ha abierto su correo.\n\nPor favor, RECUERDE ADJUNTAR el archivo PDF descargado al correo manualmente.')
    }

    if (loading) return <div className="flex justify-center items-center h-screen bg-slate-900 text-white">Cargando recibo...</div>
    if (error) return (
        <div className="flex flex-col justify-center items-center h-screen bg-slate-900 text-red-500 gap-4">
            <p>Error: {error}</p>
            <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Reintentar
            </button>
            <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white"
            >
                Volver al inicio
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Header />

            <main className="flex-1 max-w-7xl mx-auto w-full p-8 flex flex-col items-center">

                {/* Actions Toolbar */}
                <div className="w-full max-w-2xl flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-slate-300 hover:text-white flex items-center gap-2"
                    >
                        ← Volver
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        �️ Ver PDF
                    </button>
                </div>

                {/* Receipt Preview Area */}
                <div className="bg-gray-500 p-8 rounded-xl shadow-2xl overflow-auto w-full max-w-4xl flex justify-center">
                    {/* Actual Receipt Node */}
                    <div
                        ref={receiptRef}
                        className="bg-white w-[210mm] min-h-[297mm] p-[20mm] text-slate-800 shadow-lg relative"
                        style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
                    >
                        {/* Receipt Content Structure similar to PDF generator but in HTML */}
                        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
                            <div>
                                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">RECIBO DE PAGO</h1>
                                <p className="text-slate-500 mt-2">No. {payment.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-slate-800">Rental Manager</h2>
                                <p className="text-sm text-slate-500">Gestión Inmobiliaria</p>
                                <p className="text-sm text-slate-500 mt-1">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 mb-12">
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Recibido De</h3>
                                <p className="text-lg font-bold text-slate-900">{tenant.name}</p>
                                <p className="text-slate-600">{tenant.identity_number || 'No Cédula'}</p>
                                <p className="text-slate-600">{tenant.email}</p>
                                <p className="text-slate-600">{tenant.phone}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Por Concepto De</h3>
                                <p className="text-lg font-bold text-slate-900">Alquiler de Propiedad</p>
                                <p className="text-slate-600">{property.name}</p>
                                <p className="text-slate-600 max-w-xs">{property.address}</p>
                            </div>
                        </div>

                        <div className="mb-12">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left py-3 px-4 font-bold text-slate-600">Descripción</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-600">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 px-4 text-slate-800">
                                            Pago de Alquiler - {format(new Date(payment.payment_month), 'MMMM yyyy', { locale: es }).toUpperCase()}
                                        </td>
                                        <td className="py-4 px-4 text-right font-medium text-slate-900">
                                            RD$ {payment.amount_paid?.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end mb-16">
                            <div className="bg-slate-50 p-6 rounded-lg w-64">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-600 font-medium">Total Pagado</span>
                                    <span className="text-xl font-bold text-blue-600">RD$ {payment.amount_paid?.toLocaleString()}</span>
                                </div>
                                {payment.remaining_balance > 0 && (
                                    <div className="flex justify-between items-center text-sm text-red-500 pt-2 border-t border-slate-200 mt-2">
                                        <span>Pendiente</span>
                                        <span>RD$ {payment.remaining_balance?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] text-center border-t border-slate-100 pt-8">
                            <p className="text-slate-400 text-sm">Este recibo fue generado automáticamente por el sistema de gestión inmobiliaria.</p>
                            <p className="text-slate-300 text-xs mt-2">Optimard • +1 (725) 322-2506</p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}
