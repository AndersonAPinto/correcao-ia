'use client';

import { motion } from 'framer-motion';

export default function DashboardPreview() {
    return (
        <section className="py-24 bg-[#1E293B] overflow-hidden relative">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="container max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-bold text-white mb-6">Interface Intuitiva e Poderosa</h2>
                    <p className="text-slate-400 text-xl">
                        Tudo o que você precisa para gerenciar suas turmas e correções em um só lugar, com um design limpo e eficiente.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative mx-auto max-w-5xl"
                >
                    {/* Glassmorphic UI Preview */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 lg:p-8 shadow-2xl">
                        <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden shadow-inner aspect-[16/10] lg:aspect-[16/9] flex flex-col">
                            {/* Fake App Header */}
                            <div className="h-14 border-b border-white/5 bg-slate-900/80 flex items-center justify-between px-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white rounded-sm" />
                                    </div>
                                    <div className="h-4 w-32 bg-white/10 rounded-full" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 rounded-full bg-white/10" />
                                    <div className="h-8 w-24 bg-white/5 rounded-lg border border-white/10" />
                                </div>
                            </div>

                            {/* Fake App Body */}
                            <div className="flex-1 p-6 flex gap-6">
                                {/* Sidebar */}
                                <div className="w-48 hidden lg:flex flex-col gap-4">
                                    <div className="h-10 w-full bg-emerald-500/20 border border-emerald-500/30 rounded-xl" />
                                    <div className="h-10 w-full bg-white/5 rounded-xl" />
                                    <div className="h-10 w-full bg-white/5 rounded-xl" />
                                    <div className="h-10 w-full bg-white/5 rounded-xl" />
                                    <div className="mt-auto h-10 w-full bg-white/5 rounded-xl" />
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 flex flex-col gap-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="h-24 bg-white/5 border border-white/10 rounded-2xl p-4">
                                            <div className="h-3 w-12 bg-white/20 rounded-full mb-3" />
                                            <div className="h-6 w-8 bg-white/40 rounded-full" />
                                        </div>
                                        <div className="h-24 bg-white/5 border border-white/10 rounded-2xl p-4">
                                            <div className="h-3 w-16 bg-white/20 rounded-full mb-3" />
                                            <div className="h-6 w-12 bg-white/40 rounded-full" />
                                        </div>
                                        <div className="h-24 bg-white/5 border border-white/10 rounded-2xl p-4">
                                            <div className="h-3 w-14 bg-white/20 rounded-full mb-3" />
                                            <div className="h-6 w-10 bg-white/40 rounded-full" />
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="h-5 w-48 bg-white/20 rounded-full" />
                                            <div className="h-8 w-24 bg-emerald-500/20 border border-emerald-500/30 rounded-lg" />
                                        </div>

                                        <div className="space-y-4">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5">
                                                    <div className="h-10 w-10 rounded-lg bg-white/10" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-3 w-32 bg-white/20 rounded-full" />
                                                        <div className="h-2 w-full bg-white/5 rounded-full" />
                                                    </div>
                                                    <div className="h-4 w-12 bg-white/10 rounded-full" />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Overlay Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating elements */}
                        <div className="absolute -top-6 -right-6 lg:-right-12 bg-emerald-500 text-white p-6 rounded-2xl shadow-xl hidden sm:block">
                            <div className="text-3xl font-bold mb-1">98%</div>
                            <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Precisão da IA</div>
                        </div>

                        <div className="absolute -bottom-6 -left-6 lg:-left-12 bg-white text-slate-900 p-6 rounded-2xl shadow-xl hidden sm:block">
                            <div className="flex items-center gap-3">
                                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="text-sm font-bold">Correção Ativa</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

