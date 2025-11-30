'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, Brain, BarChart3, Zap, Shield, ArrowRight } from 'lucide-react';

export default function LandingPage({ onLoginClick }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Corretor 80/20
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Recursos
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Como Funciona
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Planos
            </a>
            <Button variant="outline" onClick={onLoginClick}>
              Login
            </Button>
          </nav>
          <Button className="md:hidden" onClick={onLoginClick}>
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            <Zap className="h-4 w-4" />
            Correção automática com Inteligência Artificial
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Revolucione sua{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Correção de Provas
            </span>{' '}
            com IA
          </h1>
          <p className="mb-8 text-lg text-gray-600 md:text-xl max-w-2xl mx-auto">
            Economize <strong>horas de trabalho</strong> e dedique mais tempo ao que realmente importa: 
            ensinar. Deixe o Corretor 80/20 corrigir suas avaliações com <strong>precisão</strong> e <strong>rapidez</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
              onClick={onLoginClick}
            >
              Começar Gratuitamente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Como Funciona
            </Button>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            ✓ Sem cartão de crédito &nbsp;•&nbsp; ✓ 10 créditos grátis &nbsp;•&nbsp; ✓ Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
              Tudo que você precisa para corrigir provas
            </h2>
            <p className="text-lg text-gray-600">
              Tecnologia de ponta para professores modernos que valorizam seu tempo
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-2 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Correção Automática com IA</CardTitle>
                <CardDescription>
                  OCR avançado e processamento de linguagem natural para ler manuscritos e avaliar respostas com precisão
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-indigo-200 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <Clock className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle>Economize 80% do Tempo</CardTitle>
                <CardDescription>
                  Corrija uma turma inteira em minutos, não em horas. Foque no ensino, não na burocracia
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-purple-200 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Feedback Instantâneo</CardTitle>
                <CardDescription>
                  Comentários detalhados e personalizados para cada aluno, ajudando no aprendizado contínuo
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-pink-200 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-pink-100">
                  <BarChart3 className="h-6 w-6 text-pink-600" />
                </div>
                <CardTitle>Dashboard Intuitivo</CardTitle>
                <CardDescription>
                  Acompanhe o progresso da turma, identifique dificuldades e tome decisões baseadas em dados
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-orange-200 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Processamento Rápido</CardTitle>
                <CardDescription>
                  Resultados em 5-15 segundos. Upload, processamento e feedback em tempo recorde
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-green-200 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Seguro e Confiável</CardTitle>
                <CardDescription>
                  Seus dados e os dos alunos protegidos com criptografia de ponta a ponta
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
              Como funciona?
            </h2>
            <p className="text-lg text-gray-600">
              Três passos simples para transformar sua correção de provas
            </p>
          </div>

          <div className="grid gap-12 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Crie seu Gabarito</h3>
              <p className="text-gray-600">
                Defina as respostas corretas e critérios de avaliação em segundos
              </p>
            </div>

            <div className="text-center">
              <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Upload das Provas</h3>
              <p className="text-gray-600">
                Tire fotos das respostas dos alunos e faça upload na plataforma
              </p>
            </div>

            <div className="text-center">
              <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Receba os Resultados</h3>
              <p className="text-gray-600">
                A IA processa, corrige e gera feedback detalhado automaticamente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-lg text-gray-600">
              Comece grátis e escale conforme sua necessidade
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Gratuito</CardTitle>
                <CardDescription>Perfeito para começar</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 0</span>
                  <span className="text-gray-600">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>10 créditos grátis ao se cadastrar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Correção com IA Gemini</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Dashboard básico</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Suporte por email</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" onClick={onLoginClick}>
                  Começar Grátis
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-600 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Mais Popular
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Premium</CardTitle>
                <CardDescription>Para professores dedicados</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 29,90</span>
                  <span className="text-gray-600">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span><strong>100 créditos/mês</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Correção com IA Gemini</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Dashboard completo com analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Suporte prioritário</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Exportação de relatórios</span>
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                  onClick={onLoginClick}
                >
                  Assinar Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            Pronto para economizar tempo e melhorar suas correções?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de professores que já estão transformando sua forma de corrigir provas
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100 shadow-xl"
            onClick={onLoginClick}
          >
            Criar Conta Gratuita
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Corretor 80/20</span>
              </div>
              <p className="text-sm">
                Correção inteligente de provas com IA para professores modernos
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Como Funciona</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Corretor 80/20. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
