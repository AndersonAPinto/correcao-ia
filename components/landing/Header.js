'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Header({ onLoginClick }) {
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg py-3 border-b border-white/5' : 'bg-transparent py-5'
                }`}
        >
            <div className="container max-w-7xl mx-auto px-6 flex items-center justify-between">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
                    aria-label="Voltar ao início"
                >
                    <Image src="/imagens/corregia_logotipo_lateral_sem_fundo.png" alt="Logotipo CorregIA" width={140} height={40} className="h-10 w-auto object-contain brightness-0 invert" />
                </button>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-colors">Funcionalidades</a>
                    <a href="#process" className="text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-colors">Como Funciona</a>
                    <a href="#pricing" className="text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-colors">Preços</a>
                    <button
                        onClick={() => router.push('/demo')}
                        className="text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
                    >
                        Demonstração
                    </button>
                    <div className="h-4 w-[1px] bg-white/10 mx-2" />
                    <Button variant="ghost" className="text-sm font-semibold text-slate-300 hover:text-emerald-400 hover:bg-white/5" onClick={() => onLoginClick('login')}>
                        Entrar
                    </Button>
                    <Button
                        className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105"
                        onClick={() => onLoginClick('register')}
                    >
                        Começar Grátis
                    </Button>
                </nav>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden p-2 text-slate-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 bg-slate-900 border-b border-white/10 p-6 md:hidden flex flex-col gap-4 shadow-2xl"
                >
                    <a href="#features" className="text-base font-medium text-slate-300 p-2" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
                    <a href="#process" className="text-base font-medium text-slate-300 p-2" onClick={() => setMobileMenuOpen(false)}>Como Funciona</a>
                    <a href="#pricing" className="text-base font-medium text-slate-300 p-2" onClick={() => setMobileMenuOpen(false)}>Preços</a>
                    <button
                        className="text-base font-medium text-slate-300 p-2 text-left w-full"
                        onClick={() => { setMobileMenuOpen(false); router.push('/demo'); }}
                    >
                        Demonstração
                    </button>
                    <div className="flex flex-col gap-3 pt-2">
                        <Button variant="outline" className="w-full justify-center border-white/10 text-slate-300 hover:bg-white/5" onClick={() => { setMobileMenuOpen(false); onLoginClick('login'); }}>
                            Entrar
                        </Button>
                        <Button className="w-full justify-center bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setMobileMenuOpen(false); onLoginClick('register'); }}>
                            Começar Grátis
                        </Button>
                    </div>
                </motion.div>
            )}
        </header>
    );
}
