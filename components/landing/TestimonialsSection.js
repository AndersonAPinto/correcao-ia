'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
    {
        quote: "O CorregIA mudou completamente minha forma de avaliar. O que antes levava um final de semana inteiro, agora resolvo em minutos.",
        author: "Profa. Ana Costa",
        role: "Escola Estadual São Paulo",
        rating: 5,
        image: "/imagens/placeholder-1.jpg"
    },
    {
        quote: "A precisão da IA em entender a caligrafia dos meus alunos me impressionou. O feedback gerado é muito valioso para o aprendizado.",
        author: "Prof. Ricardo Lima",
        role: "Colégio Particular Horizonte",
        rating: 5,
        image: "/imagens/placeholder-2.jpg"
    },
    {
        quote: "Excelente ferramenta para análise de dados. Consigo ver exatamente onde minha turma está falhando e agir rapidamente.",
        author: "Profa. Cláudia Menezes",
        role: "Instituto de Educação Moderna",
        rating: 5,
        image: "/imagens/placeholder-3.jpg"
    }
];

export default function TestimonialsSection() {
    return (
        <section className="py-24 bg-slate-950 overflow-hidden">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-extrabold text-white mb-6">O que os professores dizem</h2>
                    <p className="text-slate-400 text-lg font-medium">
                        Histórias reais de quem já transformou sua rotina pedagógica com nossa tecnologia.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white/[0.03] border border-white/5 p-10 rounded-3xl relative backdrop-blur-sm"
                        >
                            <div className="flex gap-1 mb-6 text-yellow-500">
                                {[...Array(t.rating)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="text-slate-300 font-medium italic mb-8 leading-relaxed">
                                "{t.quote}"
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-slate-800 overflow-hidden shrink-0">
                                    {/* Placeholder image */}
                                </div>
                                <div>
                                    <div className="font-extrabold text-white text-sm">{t.author}</div>
                                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t.role}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-20 flex justify-center">
                    <div className="inline-flex items-center gap-2 py-3 px-8 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-sm border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all">
                        Ver todas as avaliações
                    </div>
                </div>
            </div>
        </section>
    );
}

