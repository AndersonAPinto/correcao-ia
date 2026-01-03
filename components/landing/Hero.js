'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Hero({ onCtaClick }) {
    const router = useRouter();
    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-950">
            {/* Background Gradient */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-900/50 -z-10" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -z-10" />
            <div className="absolute top-1/2 left-0 w-72 h-72 bg-blue-500/10 blur-[120px] rounded-full -z-10" />

            <div className="container max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-6">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Correção de Provas com IA
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
                            Corrija Provas em <br />
                            <span className="text-emerald-400">Segundos,</span> Não Horas
                        </h1>

                        <p className="text-lg lg:text-xl text-slate-300 font-medium max-w-xl mb-10 leading-relaxed">
                            A tecnologia que entende caligrafia e contexto.
                            Automatize a correção de provas dissertativas e de múltipla escolha com a precisão que você precisa.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Button
                                size="lg"
                                className="h-14 px-8 text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xl shadow-emerald-500/20 transition-all transform hover:scale-105 group"
                                onClick={onCtaClick}
                            >
                                Começar Agora Grátis
                                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-14 px-8 text-base font-bold text-slate-300 border-2 border-white/10 rounded-xl hover:bg-white/5 transition-all"
                                onClick={() => router.push('/demo')}
                            >
                                Ver Demonstração
                            </Button>
                        </div>

                        <div className="mt-12 flex flex-col sm:flex-row items-center gap-6">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden">
                                        <div className="w-full h-full bg-slate-700" />
                                    </div>
                                ))}
                                <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                                    +2k
                                </div>
                            </div>
                            <div className="text-left">
                                <div className="flex gap-1 mb-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                                    ))}
                                </div>
                                <p className="text-sm font-bold text-slate-400">Milhares de professores satisfeitos</p>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold text-slate-400">Correção Instantânea</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold text-slate-400">Feedback Detalhado</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold text-slate-400">Inteligência Artificial</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative hidden lg:block"
                    >
                        <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900 p-2">
                            <div className="bg-slate-950 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center text-white">
                                {/* Dashboard Preview Placeholder */}
                                <div className="w-full h-full p-8 flex flex-col gap-6">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                        </div>
                                        <div className="h-4 w-32 bg-white/5 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-6 h-full">
                                        <div className="col-span-1 flex flex-col gap-4">
                                            <div className="h-10 w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl" />
                                            <div className="h-10 w-full bg-white/5 rounded-xl" />
                                            <div className="h-10 w-full bg-white/5 rounded-xl" />
                                            <div className="mt-auto h-24 w-full bg-white/5 rounded-2xl" />
                                        </div>
                                        <div className="col-span-2 flex flex-col gap-6">
                                            <div className="flex gap-6">
                                                <div className="h-24 flex-1 bg-white/5 rounded-2xl border border-white/10" />
                                                <div className="h-24 flex-1 bg-white/5 rounded-2xl border border-white/10" />
                                            </div>
                                            <div className="flex-1 bg-white/[0.02] rounded-2xl border border-white/10 p-6">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-white/10" />
                                                    <div className="flex-1">
                                                        <div className="h-3 w-24 bg-white/20 rounded-full mb-3" />
                                                        <div className="h-2 w-full bg-white/10 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="h-2 w-full bg-white/5 rounded-full" />
                                                    <div className="h-2 w-5/6 bg-white/5 rounded-full" />
                                                    <div className="h-2 w-4/6 bg-white/5 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
