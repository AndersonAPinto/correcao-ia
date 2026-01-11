'use client';

import { motion } from 'framer-motion';
import { Users, Clock, CheckCircle, BarChart } from 'lucide-react';

const stats = [
    {
        icon: <Users className="h-6 w-6" />,
        title: "2.000+ Professores",
        description: "Transformando a educação em todo o Brasil com o uso de IA.",
        color: "bg-blue-50 text-blue-600"
    },
    {
        icon: <Clock className="h-6 w-6" />,
        title: "80% Economia",
        description: "De tempo gasto com correções manuais e burocracia.",
        color: "bg-emerald-50 text-emerald-600"
    },
    {
        icon: <CheckCircle className="h-6 w-6" />,
        title: "98% Precisão",
        description: "IA treinada especificamente para contextos educacionais.",
        color: "bg-purple-50 text-purple-600"
    },
    {
        icon: <BarChart className="h-6 w-6" />,
        title: "Insights Reais",
        description: "Dados precisos sobre o aprendizado de cada aluno.",
        color: "bg-orange-50 text-orange-600"
    }
];

export default function StatsSection() {
    return (
        <section className="py-24 bg-slate-950">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group"
                        >
                            <div className={`h-12 w-12 rounded-2xl ${stat.color.replace('bg-', 'bg-opacity-20 bg-')} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                            <h3 className="text-xl font-extrabold text-white mb-2">{stat.title}</h3>
                            <p className="text-slate-400 font-medium text-sm leading-relaxed">{stat.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

