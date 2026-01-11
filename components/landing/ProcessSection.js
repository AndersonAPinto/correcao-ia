'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const steps = [
    {
        number: "01",
        title: "Crie seu Gabarito",
        description: "Defina os critérios de correção para questões dissertativas ou de múltipla escolha.",
        cta: "Saber mais"
    },
    {
        number: "02",
        title: "Upload das Provas",
        description: "Tire fotos ou escaneie as provas dos alunos. Nossa IA reconhece caligrafia automaticamente.",
        cta: "Ver demo"
    },
    {
        number: "03",
        title: "Correção Instantânea",
        description: "Receba as notas e feedbacks detalhados para cada aluno em poucos segundos.",
        cta: "Começar"
    },
    {
        number: "04",
        title: "Análise de Dados",
        description: "Visualize relatórios por turma ou habilidade e identifique pontos de melhoria.",
        cta: "Ver relatórios"
    }
];

export default function ProcessSection() {
    return (
        <section id="process" className="py-24 bg-slate-900">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl font-extrabold text-white mb-6">Como o CorregIA transforma sua rotina</h2>
                        <p className="text-slate-400 text-lg font-medium">
                            Um processo simples e intuitivo para você ganhar tempo e precisão pedagógica.
                        </p>
                    </div>
                    <Button variant="ghost" className="text-emerald-400 font-bold hover:text-emerald-300 p-0 h-auto hover:bg-transparent">
                        Ver todas as etapas <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-4">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all duration-300"
                        >
                            <div className="flex items-center gap-6 flex-1">
                                <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center text-white font-extrabold text-xl group-hover:bg-emerald-500 transition-colors shadow-lg">
                                    {step.number}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">{step.description}</p>
                                </div>
                            </div>
                            <Button variant="outline" className="rounded-2xl border-white/10 font-bold text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all px-8 h-12">
                                {step.cta}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

