'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Hero({ onCtaClick }) {
    const router = useRouter();
    return (
        <section className="relative pt-24 pb-12 lg:pt-32 lg:pb-6 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-400/20 blur-[120px] rounded-full -z-10" />

            <div className="container mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="inline-block py-1 px-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
                        ✨ Correção de Provas com IA
                    </span>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                        Corrija Provas em <br className="hidden md:block" />
                        <span className="text-gradient">Segundos, Não Horas</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                        Automatize a correção de provas dissertativas e de múltipla escolha com Inteligência Artificial.
                        Economize 80% do seu tempo e foque no que importa: ensinar.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-lg shadow-blue-500/25" onClick={onCtaClick}>
                            Começar Agora Grátis <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-12 px-8 text-base rounded-full"
                            onClick={() => router.push('/demo')}
                        >
                            Ver Demonstração
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Correção Instantânea</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Feedback Detalhado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Sem Cartão de Crédito</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
