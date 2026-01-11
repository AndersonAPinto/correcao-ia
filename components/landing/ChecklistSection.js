'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const items = [
    {
        title: "Inteligência que Aprende",
        description: "Nossa IA se adapta ao seu estilo de correção e aos critérios específicos da sua disciplina."
    },
    {
        title: "Feedback Pedagógico",
        description: "Gere comentários automáticos e personalizados para cada aluno, facilitando o aprendizado."
    },
    {
        title: "Relatórios de Desempenho",
        description: "Visualize rapidamente quais habilidades sua turma já dominou e onde precisam de reforço."
    },
    {
        title: "Integração Facilitada",
        description: "Exporte notas e relatórios diretamente para os sistemas que você já utiliza na sua escola."
    }
];

export default function ChecklistSection() {
    return (
        <section className="py-24 bg-slate-950 relative overflow-hidden">
            {/* Subtle Texture Background */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#10B981 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            <div className="container max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-8 leading-tight">
                            Apoio Completo para a <br />
                            <span className="text-emerald-400">Jornada do Professor</span>
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-8">
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                        <Check className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed font-medium">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="bg-white/[0.03] rounded-3xl p-10 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />

                            <h4 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                                <span className="h-8 w-1.5 bg-emerald-500 rounded-full" />
                                Análise por Habilidade
                            </h4>

                            <div className="space-y-8">
                                {[
                                    { label: 'Interpretação de Texto', value: 85 },
                                    { label: 'Gramática e Ortografia', value: 65 },
                                    { label: 'Coesão e Coerência', value: 92 },
                                    { label: 'Argumentação', value: 78 }
                                ].map((skill, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="flex justify-between text-sm font-bold text-slate-300">
                                            <span>{skill.label}</span>
                                            <span className="text-emerald-400">{skill.value}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${skill.value}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                                className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 pt-10 border-t border-white/5">
                                <p className="text-sm text-slate-400 italic leading-relaxed font-medium">
                                    "O CorregIA me economiza horas de trabalho toda semana. Posso dar um feedback muito mais rico para meus alunos."
                                </p>
                                <div className="mt-6 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-slate-800" />
                                    <div>
                                        <div className="text-sm font-bold text-white">Maria Silva</div>
                                        <div className="text-xs text-slate-500 font-semibold">Professora de Português</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

