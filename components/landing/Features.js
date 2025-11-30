'use client';

import { motion } from 'framer-motion';
import { Zap, Brain, BarChart3, Clock, Shield, FileText } from 'lucide-react';

const features = [
    {
        icon: <Brain className="h-6 w-6 text-purple-500" />,
        title: "IA Avançada",
        description: "Nossa IA entende caligrafia e contexto, corrigindo questões dissertativas com precisão humana."
    },
    {
        icon: <Zap className="h-6 w-6 text-yellow-500" />,
        title: "Correção Instantânea",
        description: "Faça upload de 50 provas e receba todas corrigidas em menos de 2 minutos."
    },
    {
        icon: <BarChart3 className="h-6 w-6 text-blue-500" />,
        title: "Analytics Detalhado",
        description: "Identifique as dificuldades da turma com gráficos de desempenho por habilidade e questão."
    },
    {
        icon: <Clock className="h-6 w-6 text-green-500" />,
        title: "Economia de Tempo",
        description: "Reduza em até 80% o tempo gasto com correções manuais repetitivas."
    },
    {
        icon: <FileText className="h-6 w-6 text-pink-500" />,
        title: "Gabaritos Flexíveis",
        description: "Suporte para questões de múltipla escolha e dissertativas com critérios personalizados."
    },
    {
        icon: <Shield className="h-6 w-6 text-indigo-500" />,
        title: "Seguro e Privado",
        description: "Seus dados e os dados dos seus alunos são criptografados e protegidos."
    }
];

export default function Features() {
    return (
        <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900/50">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold mb-4">Tudo que você precisa para avaliar melhor</h2>
                    <p className="text-muted-foreground text-lg">
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
                            transition={{ delay: index * 0.1 }}
                            className="bg-white dark:bg-gray-950 p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow"
                        >
                            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
