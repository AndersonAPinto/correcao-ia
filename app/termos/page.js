'use client';

import { motion } from 'framer-motion';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermosPage() {
    const router = useRouter();

    const handleLoginClick = (tab = 'login') => {
        router.push(`/?auth=${tab}`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header onLoginClick={handleLoginClick} />

            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/')}
                        className="mb-8"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar ao início
                    </Button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Termos e Condições de Uso
                        </h1>
                        <p className="text-muted-foreground mb-8">
                            Última atualização: {new Date().toLocaleDateString('pt-BR')}
                        </p>

                        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Ao acessar e utilizar a plataforma Corretor 80/20, você concorda em cumprir e estar vinculado a estes Termos e Condições de Uso.
                                    Se você não concorda com qualquer parte destes termos, não deve utilizar nossos serviços.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    O Corretor 80/20 é uma plataforma de Software como Serviço (SaaS) que oferece ferramentas de correção
                                    automatizada de provas e avaliações utilizando Inteligência Artificial. Os serviços incluem, mas não se limitam a:
                                </p>
                                <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
                                    <li>Upload e processamento de provas e avaliações</li>
                                    <li>Correção automatizada utilizando IA</li>
                                    <li>Geração de relatórios e análises de desempenho</li>
                                    <li>Gerenciamento de gabaritos e habilidades</li>
                                    <li>Análise de dados educacionais</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">3. Responsabilidades do Usuário</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    <strong className="text-foreground">Você é inteiramente responsável por:</strong>
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>
                                        <strong className="text-foreground">Dados e Conteúdo:</strong> Todos os dados, informações, provas,
                                        avaliações e qualquer conteúdo que você enviar, armazenar ou processar através da plataforma são de sua
                                        exclusiva responsabilidade. Você garante que possui todos os direitos necessários sobre os dados fornecidos.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Precisão dos Dados:</strong> Você é responsável pela precisão,
                                        completude e atualização de todos os dados fornecidos. A plataforma não se responsabiliza por erros
                                        decorrentes de informações incorretas ou incompletas fornecidas pelo usuário.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Uso Adequado:</strong> Você concorda em utilizar a plataforma apenas
                                        para fins legais e educacionais, respeitando todas as leis e regulamentações aplicáveis, incluindo leis
                                        de proteção de dados e privacidade.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Segurança da Conta:</strong> Você é responsável por manter a
                                        confidencialidade de suas credenciais de acesso e por todas as atividades que ocorram em sua conta.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Validação de Resultados:</strong> Você reconhece que a correção
                                        automatizada é uma ferramenta de apoio e que é sua responsabilidade validar, revisar e confirmar todos
                                        os resultados gerados pela plataforma antes de utilizá-los para fins oficiais ou decisões importantes.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">4. Limitação de Responsabilidade</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    <strong className="text-foreground">A PLATAFORMA É FORNECIDA "COMO ESTÁ" E "CONFORME DISPONÍVEL".</strong>
                                    Nós nos isentamos expressamente de todas as garantias, explícitas ou implícitas, incluindo, mas não se limitando a:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>
                                        <strong className="text-foreground">Precisão dos Resultados:</strong> Não garantimos que os resultados
                                        da correção automatizada sejam 100% precisos, completos ou livres de erros. A Inteligência Artificial
                                        pode apresentar limitações e imprecisões. É responsabilidade do usuário validar todos os resultados.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Disponibilidade do Serviço:</strong> Não garantimos que o serviço
                                        estará disponível de forma ininterrupta ou livre de erros. Podemos realizar manutenções, atualizações
                                        ou interrupções temporárias sem aviso prévio.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Perda de Dados:</strong> Não nos responsabilizamos por perda,
                                        corrupção ou indisponibilidade de dados do usuário, mesmo que decorrente de falhas técnicas,
                                        ataques cibernéticos ou outras causas.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Decisões Baseadas nos Resultados:</strong> Não nos responsabilizamos
                                        por quaisquer decisões, ações ou consequências decorrentes do uso dos resultados gerados pela plataforma.
                                        O usuário assume total responsabilidade por todas as decisões tomadas com base nos dados processados.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Danos Indiretos:</strong> Em nenhuma circunstância seremos
                                        responsáveis por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda
                                        de lucros, dados, reputação ou oportunidades de negócio.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">5. Isenção de Responsabilidade por Processos</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    <strong className="text-foreground">O USUÁRIO RECONHECE E CONCORDA QUE:</strong>
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>
                                        A plataforma Corretor 80/20 é uma ferramenta de apoio e não substitui o julgamento profissional,
                                        a análise crítica ou a validação humana dos resultados.
                                    </li>
                                    <li>
                                        Qualquer processo judicial, administrativo ou de qualquer natureza decorrente do uso da plataforma,
                                        dos dados fornecidos pelo usuário ou dos resultados gerados, será de responsabilidade exclusiva do usuário.
                                    </li>
                                    <li>
                                        Não seremos responsáveis por processos, reclamações, demandas ou ações judiciais relacionadas a:
                                        <ul className="list-disc pl-6 mt-2 space-y-1">
                                            <li>Precisão ou imprecisão dos resultados de correção</li>
                                            <li>Decisões educacionais ou administrativas baseadas nos resultados</li>
                                            <li>Uso inadequado ou indevido da plataforma</li>
                                            <li>Violation de direitos de terceiros através do conteúdo fornecido</li>
                                            <li>Questões relacionadas à privacidade ou proteção de dados dos alunos</li>
                                            <li>Consequências de falhas técnicas ou indisponibilidade do serviço</li>
                                        </ul>
                                    </li>
                                    <li>
                                        O usuário se compromete a nos indenizar e manter indenes de qualquer processo, reclamação, perda,
                                        dano, responsabilidade e despesa (incluindo honorários advocatícios) decorrentes do uso da plataforma
                                        ou violação destes termos.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">6. Propriedade Intelectual</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Todos os direitos de propriedade intelectual relacionados à plataforma, incluindo software, algoritmos,
                                    design, marcas e conteúdo, são de nossa propriedade ou licenciados para nós. O usuário não adquire
                                    nenhum direito de propriedade sobre a plataforma ou seus componentes.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">7. Privacidade e Proteção de Dados</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    O tratamento de dados pessoais está sujeito à nossa Política de Privacidade, que faz parte integrante
                                    destes Termos. O usuário é responsável por garantir que possui autorização adequada para processar dados
                                    de terceiros (incluindo alunos) através da plataforma e por cumprir todas as leis de proteção de dados aplicáveis.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">8. Modificações dos Termos</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor
                                    imediatamente após a publicação. O uso continuado da plataforma após as modificações constitui aceitação
                                    dos novos termos.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">9. Rescisão</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Podemos suspender ou encerrar sua conta e acesso à plataforma a qualquer momento, sem aviso prévio,
                                    em caso de violação destes Termos ou por qualquer outro motivo a nosso critério. O usuário pode
                                    encerrar sua conta a qualquer momento através das configurações da plataforma.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">10. Lei Aplicável e Foro</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Estes Termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca
                                    onde está localizada nossa sede, com exclusão de qualquer outro, por mais privilegiado que seja.
                                </p>
                            </section>

                            <section className="bg-muted/50 p-6 rounded-lg border mt-8">
                                <h2 className="text-2xl font-semibold mb-4">Contato</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Para questões sobre estes Termos e Condições, entre em contato conosco através dos canais disponíveis
                                    na plataforma ou através do email de suporte.
                                </p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

