'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-slate-950 border-t border-white/5 py-20">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <Image src="/imagens/corregia_logotipo_lateral_sem_fundo.png" alt="Logotipo CorregIA" width={140} height={40} className="h-10 w-auto object-contain brightness-0 invert" />
                        </div>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-sm font-medium">
                            A plataforma de correção de provas mais avançada do mercado brasileiro.
                            Tecnologia de ponta a serviço da educação.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-extrabold text-white mb-6 uppercase text-xs tracking-[0.2em]">Produto</h4>
                        <ul className="space-y-4 text-base font-medium">
                            <li><a href="#features" className="text-slate-500 hover:text-emerald-400 transition-colors">Funcionalidades</a></li>
                            <li><a href="#process" className="text-slate-500 hover:text-emerald-400 transition-colors">Como Funciona</a></li>
                            <li><a href="#pricing" className="text-slate-500 hover:text-emerald-400 transition-colors">Preços</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-extrabold text-white mb-6 uppercase text-xs tracking-[0.2em]">Legal</h4>
                        <ul className="space-y-4 text-base font-medium">
                            <li><Link href="/termos" className="text-slate-500 hover:text-emerald-400 transition-colors">Termos de Uso</Link></li>
                            <li><Link href="/privacidade" className="text-slate-500 hover:text-emerald-400 transition-colors">Privacidade</Link></li>
                            <li><a href="mailto:contato@corregia.com.br" className="text-slate-500 hover:text-emerald-400 transition-colors">Suporte</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-bold text-slate-500">
                    <p>© {new Date().getFullYear()} CorregIA. Desenvolvido com ❤️ para professores.</p>
                    <div className="flex gap-10">
                        <a href="#" className="hover:text-emerald-400 transition-colors">Instagram</a>
                        <a href="#" className="hover:text-emerald-400 transition-colors">LinkedIn</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
