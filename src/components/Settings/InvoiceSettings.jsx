// src/components/Settings/InvoiceSettings.jsx
import { useState, useEffect, useRef } from 'react'
import { useUserSettings } from '../../hooks/useUserSettings'
import Button from '../Common/Button'

export default function InvoiceSettings({ showToast }) {
    const { settings, loading, updateSettings, uploadSignature } = useUserSettings()
    const [formData, setFormData] = useState({
        landlord_name: '',
        business_name: '',
        phone: '',
        email: '',
        invoice_footer: '',
    })
    const [signaturePreview, setSignaturePreview] = useState(null)
    const [saving, setSaving] = useState(false)
    const [uploadingSignature, setUploadingSignature] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (settings) {
            setFormData({
                landlord_name: settings.landlord_name || '',
                business_name: settings.business_name || '',
                phone: settings.phone || '',
                email: settings.email || '',
                invoice_footer: settings.invoice_footer || '',
            })
            if (settings.signature_url) setSignaturePreview(settings.signature_url)
        }
    }, [settings])

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSignatureUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingSignature(true)
        const { url, error } = await uploadSignature(file)
        if (error) {
            showToast(error, 'error')
        } else {
            setSignaturePreview(url)
            await updateSettings({ signature_url: url })
            showToast('Firma guardada correctamente', 'success')
        }
        setUploadingSignature(false)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const { error } = await updateSettings(formData)
        setSaving(false)
        if (error) {
            showToast('Error al guardar ajustes: ' + error, 'error')
        } else {
            showToast('Ajustes de factura guardados', 'success')
        }
    }

    if (loading) return <div className="py-6 text-gray-500">Cargando...</div>

    return (
        <div>
            <h3 className="text-[20px] font-bold text-gray-900 mb-2">Plantilla de Factura</h3>
            <p className="text-[16px] text-gray-600 mb-6">
                Esta información aparecerá en todos los recibos que generes. Solo afecta tu cuenta.
            </p>

            <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="accessible-label">Nombre del Arrendador</label>
                        <input
                            name="landlord_name"
                            value={formData.landlord_name}
                            onChange={handleChange}
                            placeholder="Tu nombre completo"
                            className="accessible-input"
                        />
                    </div>
                    <div>
                        <label className="accessible-label">Nombre del Negocio</label>
                        <input
                            name="business_name"
                            value={formData.business_name}
                            onChange={handleChange}
                            placeholder="Ej: Propiedades Bautista"
                            className="accessible-input"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="accessible-label">Teléfono</label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="(829) 555-0012"
                            className="accessible-input"
                        />
                    </div>
                    <div>
                        <label className="accessible-label">Correo Electrónico</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="correo@ejemplo.com"
                            className="accessible-input"
                        />
                    </div>
                </div>

                <div>
                    <label className="accessible-label">Nota al pie de la factura</label>
                    <textarea
                        name="invoice_footer"
                        value={formData.invoice_footer}
                        onChange={handleChange}
                        placeholder="Ej: Este recibo es un comprobante válido de pago."
                        maxLength={200}
                        rows={2}
                        className="accessible-input resize-none"
                    />
                    <p className="text-right text-[14px] text-gray-400 mt-1">{formData.invoice_footer.length}/200</p>
                </div>

                {/* Firma */}
                <div>
                    <label className="accessible-label">Firma del Arrendador</label>
                    <div className="flex items-start gap-6">
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition"
                            style={{ minWidth: '180px', minHeight: '100px' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {signaturePreview ? (
                                <img
                                    src={signaturePreview}
                                    alt="Firma"
                                    style={{ maxHeight: '70px', maxWidth: '160px', objectFit: 'contain' }}
                                />
                            ) : (
                                <>
                                    <span className="text-3xl mb-2">🖼️</span>
                                    <span className="text-[14px] text-gray-500 text-center">Haz clic para subir</span>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-[16px] text-gray-600">PNG o JPG con fondo transparente recomendado.</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingSignature}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg transition text-[16px]"
                                style={{ minHeight: '48px' }}
                            >
                                {uploadingSignature ? 'Subiendo...' : signaturePreview ? 'Cambiar firma' : 'Seleccionar archivo'}
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg"
                            className="hidden"
                            onChange={handleSignatureUpload}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar Ajustes de Factura'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
