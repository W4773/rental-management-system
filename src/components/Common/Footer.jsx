import React from 'react'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">

                    {/* Brand & Version */}
                    <div className="text-center md:text-left">
                        <p className="text-sm">
                            &copy; {currentYear} <span className="font-semibold text-white">Optimard</span>. Todos los derechos reservados.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Versión 1.0.1</p>
                    </div>

                    {/* Support Contact */}
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <div className="flex items-center gap-2 text-sm hover:text-white transition-colors">
                            <span className="text-green-500 text-lg">📱</span>
                            <a
                                href="https://wa.me/17253222506"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                WhatsApp: +1 (725) 322-2506
                            </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm hover:text-white transition-colors">
                            <span className="text-blue-500 text-lg">✉️</span>
                            <a
                                href="mailto:optimard@innovaflowtech.com"
                                className="hover:underline"
                            >
                                optimard@innovaflowtech.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Tagline */}
                <div className="text-center mt-6 pt-6 border-t border-slate-800/50">
                    <p className="text-xs text-slate-600">
                        Desarrollado por <span className="text-slate-400 font-medium">Optimard</span>, equipo especializado en la creación de soluciones innovadoras y adaptadas al cliente.
                    </p>
                </div>
            </div>
        </footer>
    )
}
