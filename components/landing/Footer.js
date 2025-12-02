'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-gray-50 dark:bg-gray-950 border-t py-12">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                80
                            </div>
                            <span className="text-xl font-bold">Corretor 80/20</span>
                        </div>
                        <p className="text-muted-foreground max-w-xs">
                            A plataforma de correção de provas mais avançada do mercado. Economize tempo e foque no ensino.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Produto</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="#features" className="hover:text-blue-600">Funcionalidades</a></li>
                            <li><a href="#pricing" className="hover:text-blue-600">Preços</a></li>
                            <li><a href="#" className="hover:text-blue-600">Atualizações</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/termos" className="hover:text-blue-600">Termos de Uso</Link></li>
                            <li><Link href="/privacidade" className="hover:text-blue-600">Privacidade</Link></li>
                            <li><a href="mailto:contato@contato.com.br" className="hover:text-blue-600">Contato</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Corretor 80/20. Todos os direitos reservados.
                </div>
            </div>
        </footer>
    );
}
