'use client';

import { motion } from 'framer-motion';
import { Zap, Brain, BarChart3, Clock, Shield, FileText } from 'lucide-react';

const features = [
    {
        icon: <Brain className="h-7 w-7" />,
        title: "IA Avançada",
        description: "Nossa IA entende caligrafia e contexto, corrigindo questões dissertativas com precisão humana."
    },
    {
        icon: <Zap className="h-7 w-7" />,
        title: "Correção Instantânea",
        description: "Faça upload de 20 provas e receba todas corrigidas em menos de 2 minutos."
    },
    {
        icon: <BarChart3 className="h-7 w-7" />,
        title: "Analytics Detalhado",
        description: "Identifique as dificuldades da turma com gráficos de desempenho por habilidade e questão."
    },
    {
        icon: <Clock className="h-7 w-7" />,
        title: "Economia de Tempo",
        description: "Reduza em até 80% o tempo gasto com correções manuais repetitivas."
    },
    {
        icon: <FileText className="h-7 w-7" />,
        title: "Gabaritos Flexíveis",
        description: "Suporte para questões de múltipla escolha e dissertativas com critérios personalizados."
    },
    {
        icon: <Shield className="h-7 w-7" />,
        title: "Seguro e Privado",
        description: "Seus dados e os dados dos seus alunos são criptografados e protegidos."
    }
];

export default function Features() {
    return (
        <section id="features" className="py-24 bg-slate-900">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-4xl font-extrabold text-white mb-6">Tudo que você precisa para avaliar melhor</h2>
                    <p className="text-slate-400 text-xl font-medium">
                        Ferramentas poderosas para professores que querem focar no ensino, não na burocracia.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="bg-white/[0.03] p-8 rounded-3xl border border-white/5 hover:bg-white/[0.06] hover:border-emerald-500/20 hover:-translate-y-2 transition-all duration-300 group"
                        >
                            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-lg shadow-emerald-500/5">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed font-medium">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
