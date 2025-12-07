'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Upload, CheckCircle2, XCircle, AlertCircle, BarChart3, FileText, Download, Sparkles, Clock, Users, TrendingUp } from 'lucide-react';
import Header from '@/components/landing/Header';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('upload');

    const handleLoginClick = (tab = 'login') => {
        router.push(`/?auth=${tab}`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header onLoginClick={handleLoginClick} />

            <main className="pt-20">
                {/* Hero da Demo */}
                <section className="relative py-16 lg:py-24 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-400/20 blur-[120px] rounded-full -z-10" />

                    <div className="container mx-auto px-4 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-block py-1 px-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
                                🎯 Demonstração Interativa
                            </span>
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                                Veja como funciona na prática
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                                Experimente o fluxo completo de correção de provas com IA, desde o upload até os resultados detalhados
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Demo Interativa */}
                <section className="py-12 bg-gray-50 dark:bg-gray-900/50">
                    <div className="container mx-auto px-10">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
                            <TabsList className="grid w-full grid-cols-3 mb-8">
                                <TabsTrigger value="upload" className="flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    <span className="hidden sm:inline">1. Upload</span>
                                    <span className="sm:hidden">Upload</span>
                                </TabsTrigger>
                                <TabsTrigger value="correction" className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    <span className="hidden sm:inline">2. CorregIA</span>
                                    <span className="sm:hidden">IA</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    <span className="hidden sm:inline">3. Resultados</span>
                                    <span className="sm:hidden">Resultados</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="upload" className="mt-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2">
                                        <CardHeader>
                                            <CardTitle className="text-2xl flex items-center gap-2">
                                                <Upload className="h-6 w-6 text-blue-600" />
                                                Faça upload das provas
                                            </CardTitle>
                                            <CardDescription className="text-base">
                                                Envie fotos ou PDFs das provas dos seus alunos. Suportamos múltiplos formatos e reconhecimento de escrita à mão.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="border-2 border-dashed rounded-xl p-12 text-center hover:border-blue-500 transition-colors bg-muted/30">
                                                <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                                <p className="text-lg font-medium mb-2">
                                                    Arraste e solte ou clique para selecionar
                                                </p>
                                                <p className="text-sm text-muted-foreground mb-6">
                                                    Suporta: JPG, PNG, PDF (até 20 provas por vez)
                                                </p>
                                                <Button size="lg" className="rounded-full">
                                                    Selecionar Arquivos
                                                </Button>
                                            </div>

                                            <div className="grid md:grid-cols-3 gap-4 mt-8">
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                                        <span className="font-semibold">OCR Avançado</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Reconhece escrita à mão com alta precisão
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                        <span className="font-semibold">Múltiplos Formatos</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Aceita fotos, scans e PDFs
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle2 className="h-5 w-5 text-purple-600" />
                                                        <span className="font-semibold">Processamento Rápido</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        20 provas em menos de 2 minutos
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="correction" className="mt-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2">
                                        <CardHeader>
                                            <CardTitle className="text-2xl flex items-center gap-2">
                                                <Sparkles className="h-6 w-6 text-purple-600" />
                                                Correção Automática com IA
                                            </CardTitle>
                                            <CardDescription className="text-base">
                                                Nossa Inteligência Artificial analisa cada questão, compreende o contexto e fornece feedback detalhado automaticamente.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                                            IA
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm text-muted-foreground">Processando...</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                                                            <motion.div
                                                                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: '85%' }}
                                                                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                                                            />
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            Analisando 20 provas... 42/20 concluídas
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mt-6">
                                                <h3 className="font-semibold text-lg mb-4">Exemplo de Correção:</h3>

                                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className="flex items-start gap-3">
                                                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-semibold">Questão 1: Correta ✓</span>
                                                                <span className="text-sm font-medium text-green-700 dark:text-green-400">10/10</span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Resposta demonstrou compreensão completa do conceito de fotossíntese.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-semibold">Questão 2: Parcialmente Correta</span>
                                                                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">7/10</span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mb-2">
                                                                Resposta demonstrou compreensão parcial. Faltou mencionar o papel da clorofila.
                                                            </p>
                                                            <div className="text-xs bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                                                                <strong>Feedback:</strong> Tente explicar como a clorofila captura a energia luminosa.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                    <div className="flex items-start gap-3">
                                                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-semibold">Questão 3: Incorreta</span>
                                                                <span className="text-sm font-medium text-red-700 dark:text-red-400">3/10</span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mb-2">
                                                                Resposta não demonstrou compreensão do conceito. Confundiu mitocôndria com cloroplasto.
                                                            </p>
                                                            <div className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded border border-red-300 dark:border-red-700">
                                                                <strong>Feedback:</strong> Revise a diferença entre respiração celular e fotossíntese.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 p-4 bg-muted rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                                    <span className="font-semibold">Análise de Habilidades</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    A IA identifica automaticamente quais habilidades foram demonstradas e quais precisam de reforço,
                                                    facilitando o planejamento de aulas futuras.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="results" className="mt-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2">
                                        <CardHeader>
                                            <CardTitle className="text-2xl flex items-center gap-2">
                                                <BarChart3 className="h-6 w-6 text-green-600" />
                                                Resultados e Analytics
                                            </CardTitle>
                                            <CardDescription className="text-base">
                                                Visualize o desempenho da turma em tempo real com gráficos interativos e relatórios detalhados.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Estatísticas Rápidas */}
                                            <div className="grid md:grid-cols-4 gap-4">
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Users className="h-5 w-5 text-blue-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Alunos</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">50</p>
                                                </div>
                                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Média Geral</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">7.2</p>
                                                </div>
                                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle2 className="h-5 w-5 text-purple-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Aprovados</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">38</p>
                                                    <p className="text-xs text-muted-foreground">76%</p>
                                                </div>
                                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="h-5 w-5 text-orange-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Tempo Economizado</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">12h</p>
                                                </div>
                                            </div>

                                            {/* Gráficos e Relatórios */}
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="p-6 bg-muted rounded-xl border">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <BarChart3 className="h-6 w-6 text-blue-600" />
                                                        <h3 className="font-semibold text-lg">Desempenho por Habilidade</h3>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {[
                                                            { name: 'Compreensão de Texto', value: 85, color: 'bg-blue-500' },
                                                            { name: 'Análise Crítica', value: 72, color: 'bg-green-500' },
                                                            { name: 'Síntese de Ideias', value: 68, color: 'bg-yellow-500' },
                                                            { name: 'Aplicação Prática', value: 58, color: 'bg-orange-500' },
                                                        ].map((skill, idx) => (
                                                            <div key={idx}>
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className="font-medium">{skill.name}</span>
                                                                    <span className="text-muted-foreground">{skill.value}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                                    <motion.div
                                                                        className={`${skill.color} h-2 rounded-full`}
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${skill.value}%` }}
                                                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-muted rounded-xl border">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <FileText className="h-6 w-6 text-purple-600" />
                                                        <h3 className="font-semibold text-lg">Relatórios Disponíveis</h3>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="p-3 bg-background rounded-lg border flex items-center justify-between hover:bg-muted transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <FileText className="h-5 w-5 text-blue-600" />
                                                                <span className="font-medium">Relatório Completo da Turma</span>
                                                            </div>
                                                            <Download className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="p-3 bg-background rounded-lg border flex items-center justify-between hover:bg-muted transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <BarChart3 className="h-5 w-5 text-green-600" />
                                                                <span className="font-medium">Análise por Questão</span>
                                                            </div>
                                                            <Download className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="p-3 bg-background rounded-lg border flex items-center justify-between hover:bg-muted transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <TrendingUp className="h-5 w-5 text-purple-600" />
                                                                <span className="font-medium">Evolução Individual</span>
                                                            </div>
                                                            <Download className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="p-3 bg-background rounded-lg border flex items-center justify-between hover:bg-muted transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <Users className="h-5 w-5 text-orange-600" />
                                                                <span className="font-medium">Perfis de Aprendizagem</span>
                                                            </div>
                                                            <Download className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex gap-2">
                                                        <Button variant="outline" size="sm" className="flex-1">
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Exportar Excel
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="flex-1">
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Exportar CSV
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Destaques */}
                                            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                                    <Sparkles className="h-5 w-5 text-purple-600" />
                                                    Insights Automáticos
                                                </h3>
                                                <ul className="space-y-2 text-sm">
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                        <span><strong>Questão 3</strong> teve maior taxa de erro (68%) - considere revisar este conteúdo</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                        <span><strong>Habilidade "Aplicação Prática"</strong> precisa de reforço - 12 alunos com dificuldade</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                        <span><strong>5 alunos</strong> demonstraram excelência em todas as habilidades</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>

                {/* Benefícios */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Por que escolher o CorregIA?
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Economize tempo, obtenha insights valiosos e foque no que realmente importa: ensinar.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {[
                                {
                                    icon: Clock,
                                    title: 'Economia de Tempo',
                                    description: 'Reduza em até 80% o tempo gasto com correções. 20 provas corrigidas em menos de 2 minutos.',
                                    color: 'text-blue-600'
                                },
                                {
                                    icon: BarChart3,
                                    title: 'Insights Detalhados',
                                    description: 'Identifique dificuldades da turma com análises automáticas por habilidade e questão.',
                                    color: 'text-green-600'
                                },
                                {
                                    icon: Sparkles,
                                    title: 'Feedback Automático',
                                    description: 'Cada aluno recebe feedback personalizado sobre suas respostas, facilitando o aprendizado.',
                                    color: 'text-purple-600'
                                }
                            ].map((benefit, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-6 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <benefit.icon className={`h-10 w-10 ${benefit.color} mb-4`} />
                                    <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                                    <p className="text-muted-foreground">{benefit.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Final */}
                <section className="py-16 bg-gradient-to-b from-blue-50 to-background dark:from-gray-900 dark:to-background">
                    <div className="container mx-auto px-4 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="max-w-2xl mx-auto"
                        >
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Pronto para transformar sua forma de corrigir provas?
                            </h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                Crie sua conta gratuita e comece a economizar tempo hoje mesmo.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button
                                    size="lg"
                                    className="h-12 px-8 text-base rounded-full shadow-lg shadow-blue-500/25"
                                    onClick={() => handleLoginClick('register')}
                                >
                                    Começar Agora Grátis <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-12 px-8 text-base rounded-full"
                                    onClick={() => handleLoginClick('login')}
                                >
                                    Já tenho uma conta
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-6">
                                ✨ Teste gratuito • Sem compromisso • Cancele quando quiser
                            </p>
                        </motion.div>
                    </div>
                </section>
            </main>
        </div>
    );
}


