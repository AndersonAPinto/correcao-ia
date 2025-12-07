'use client';

import { motion } from 'framer-motion';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacidadePage() {
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
                            Política de Privacidade
                        </h1>
                        <p className="text-muted-foreground mb-8">
                            Última atualização: {new Date().toLocaleDateString('pt-BR')}
                        </p>

                        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Esta Política de Privacidade descreve como a plataforma Corretor 80/20 coleta, utiliza, armazena e protege
                                    suas informações pessoais e os dados que você fornece ao utilizar nossos serviços. Ao utilizar nossa
                                    plataforma, você concorda com as práticas descritas nesta política.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">2. Responsabilidade do Usuário pelos Dados</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    <strong className="text-foreground">É DE SUA EXCLUSIVA RESPONSABILIDADE:</strong>
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>
                                        <strong className="text-foreground">Autorização para Processamento:</strong> Você garante que possui
                                        todas as autorizações, consentimentos e bases legais necessárias para processar dados pessoais de
                                        terceiros (incluindo, mas não limitado a, dados de alunos, professores e outros indivíduos) através
                                        da nossa plataforma.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Conformidade Legal:</strong> Você é responsável por garantir que
                                        o processamento de dados através da plataforma está em conformidade com todas as leis aplicáveis de
                                        proteção de dados, incluindo a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e outras
                                        regulamentações pertinentes.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Dados Sensíveis:</strong> Você reconhece que dados educacionais
                                        podem ser considerados dados sensíveis e se compromete a processá-los apenas quando autorizado por lei
                                        e com as devidas salvaguardas.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Notificação de Incidentes:</strong> Em caso de violação de dados
                                        ou incidentes de segurança relacionados aos dados que você forneceu, você é responsável por notificar
                                        as autoridades competentes e os titulares dos dados, conforme exigido por lei.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Uso Adequado:</strong> Você se compromete a não utilizar a
                                        plataforma para processar dados de forma ilegal, não autorizada ou que viole direitos de terceiros.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">3. Dados que Coletamos</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    Coletamos os seguintes tipos de informações:
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">3.1. Dados da Conta do Usuário</h3>
                                        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                                            <li>Nome completo</li>
                                            <li>Endereço de email</li>
                                            <li>Foto de perfil (opcional)</li>
                                            <li>Credenciais de autenticação (hash de senha ou tokens OAuth)</li>
                                            <li>Informações de assinatura e pagamento</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">3.2. Dados Fornecidos pelo Usuário</h3>
                                        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                                            <li>Provas, avaliações e documentos enviados</li>
                                            <li>Dados de alunos (nomes, notas, respostas, etc.)</li>
                                            <li>Gabaritos e critérios de correção</li>
                                            <li>Habilidades e perfis de avaliação</li>
                                            <li>Turmas e informações educacionais</li>
                                            <li>Qualquer outro conteúdo que você enviar à plataforma</li>
                                        </ul>
                                        <p className="text-muted-foreground mt-2 italic">
                                            <strong>Importante:</strong> Estes dados são de sua responsabilidade. Você garante que possui
                                            autorização para processá-los e que está em conformidade com todas as leis aplicáveis.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">3.3. Dados de Uso</h3>
                                        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                                            <li>Logs de acesso e autenticação</li>
                                            <li>Informações sobre como você utiliza a plataforma</li>
                                            <li>Endereço IP e informações do dispositivo</li>
                                            <li>Cookies e tecnologias similares</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">4. Como Utilizamos os Dados</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    Utilizamos os dados coletados para:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Fornecer, manter e melhorar nossos serviços</li>
                                    <li>Processar correções automatizadas de provas e avaliações</li>
                                    <li>Gerar relatórios e análises de desempenho</li>
                                    <li>Autenticar usuários e garantir a segurança da plataforma</li>
                                    <li>Comunicar-nos com você sobre o serviço</li>
                                    <li>Cumprir obrigações legais e regulatórias</li>
                                    <li>Prevenir fraudes e garantir a segurança</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">5. Compartilhamento de Dados</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    Não vendemos seus dados pessoais. Podemos compartilhar informações apenas nas seguintes situações:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>
                                        <strong className="text-foreground">Prestadores de Serviços:</strong> Com empresas que nos auxiliam
                                        a operar a plataforma (hospedagem, processamento de pagamentos, etc.), sob contratos que exigem
                                        proteção adequada dos dados.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Obrigações Legais:</strong> Quando exigido por lei, ordem judicial
                                        ou processo legal.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Proteção de Direitos:</strong> Para proteger nossos direitos,
                                        propriedade ou segurança, ou de nossos usuários.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">Com seu Consentimento:</strong> Quando você autorizar explicitamente.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">6. Segurança dos Dados</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Criptografia de dados em trânsito e em repouso</li>
                                    <li>Controles de acesso e autenticação</li>
                                    <li>Monitoramento de segurança e detecção de ameaças</li>
                                    <li>Backups regulares</li>
                                    <li>Treinamento de equipe em segurança de dados</li>
                                </ul>
                                <p className="text-muted-foreground mt-4">
                                    <strong className="text-foreground">No entanto, nenhum sistema é 100% seguro.</strong> Você reconhece que
                                    existe risco inerente na transmissão e armazenamento de dados eletrônicos e que não podemos garantir
                                    segurança absoluta.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">7. Retenção de Dados</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Mantemos seus dados pessoais enquanto sua conta estiver ativa e conforme necessário para fornecer nossos
                                    serviços, cumprir obrigações legais ou resolver disputas. Dados de avaliações e provas podem ser
                                    mantidos por períodos determinados por você ou conforme exigido por lei. Você pode solicitar a exclusão
                                    de seus dados a qualquer momento, sujeito a obrigações legais de retenção.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">8. Seus Direitos (LGPD)</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    Conforme a LGPD, você possui os seguintes direitos:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong className="text-foreground">Confirmação e Acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
                                    <li><strong className="text-foreground">Correção:</strong> Solicitar correção de dados incompletos ou desatualizados</li>
                                    <li><strong className="text-foreground">Anonimização, Bloqueio ou Eliminação:</strong> Solicitar a eliminação ou anonimização de dados desnecessários</li>
                                    <li><strong className="text-foreground">Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                                    <li><strong className="text-foreground">Eliminação:</strong> Solicitar a exclusão de dados tratados com consentimento</li>
                                    <li><strong className="text-foreground">Revogação do Consentimento:</strong> Revogar consentimento a qualquer momento</li>
                                </ul>
                                <p className="text-muted-foreground mt-4">
                                    Para exercer estes direitos, entre em contato conosco através dos canais disponíveis na plataforma.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">9. Cookies e Tecnologias Similares</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma
                                    e personalizar conteúdo. Você pode gerenciar preferências de cookies através das configurações do seu navegador.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">10. Dados de Menores</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Nossa plataforma não é destinada a menores de 18 anos. Se você processa dados de menores através da
                                    plataforma, você é responsável por garantir que possui todas as autorizações necessárias dos responsáveis
                                    legais e que está em conformidade com todas as leis aplicáveis de proteção de menores.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">11. Transferências Internacionais</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Seus dados podem ser processados e armazenados em servidores localizados fora do Brasil. Ao utilizar nossos
                                    serviços, você consente com a transferência de seus dados para estes locais, que implementam medidas de
                                    proteção adequadas.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">12. Alterações nesta Política</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas
                                    através da plataforma ou por email. A continuação do uso após as alterações constitui aceitação da nova política.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">13. Isenção de Responsabilidade</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    <strong className="text-foreground">O USUÁRIO RECONHECE QUE:</strong>
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>
                                        A plataforma não se responsabiliza por violações de privacidade ou proteção de dados decorrentes do
                                        uso inadequado ou não autorizado da plataforma pelo usuário.
                                    </li>
                                    <li>
                                        Não seremos responsáveis por processos, reclamações ou demandas relacionadas ao processamento de dados
                                        que você forneceu sem as devidas autorizações ou em violação de leis aplicáveis.
                                    </li>
                                    <li>
                                        O usuário se compromete a nos indenizar e manter indenes de qualquer processo, reclamação, perda, dano,
                                        responsabilidade e despesa (incluindo honorários advocatícios) decorrentes de violações de privacidade ou
                                        proteção de dados relacionadas aos dados que você forneceu ou processou através da plataforma.
                                    </li>
                                    <li>
                                        Embora implementemos medidas de segurança, não podemos garantir segurança absoluta e não seremos
                                        responsáveis por incidentes de segurança que ocorram apesar de nossas medidas de proteção.
                                    </li>
                                </ul>
                            </section>

                            <section className="bg-muted/50 p-6 rounded-lg border mt-8">
                                <h2 className="text-2xl font-semibold mb-4">Contato</h2>
                                <p className="text-muted-foreground leading-relaxed mb-2">
                                    Para questões sobre privacidade, proteção de dados ou para exercer seus direitos, entre em contato conosco:
                                </p>
                                <ul className="list-none space-y-1 text-muted-foreground">
                                    <li>Através dos canais disponíveis na plataforma</li>
                                    <li>Através do email de suporte</li>
                                    <li>Através do Encarregado de Proteção de Dados (DPO), se aplicável</li>
                                </ul>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

