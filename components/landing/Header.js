'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    aria-label="Voltar ao início"
                >
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        80
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        Corretor 80/20
                    </span>
                </button>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm font-medium hover:text-blue-600 transition-colors">Funcionalidades</a>
                    <a href="#pricing" className="text-sm font-medium hover:text-blue-600 transition-colors">Preços</a>
                    <button
                        onClick={() => router.push('/demo')}
                        className="text-sm font-medium hover:text-blue-600 transition-colors"
                    >
                        Demonstração
                    </button>
                    <Button variant="ghost" onClick={() => onLoginClick('login')}>Entrar</Button>
                    <Button onClick={() => onLoginClick('register')}>Começar Grátis</Button>
                </nav>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 bg-white dark:bg-gray-950 border-b p-4 md:hidden flex flex-col gap-4 shadow-lg"
                >
                    <a href="#features" className="text-sm font-medium p-2" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
                    <a href="#pricing" className="text-sm font-medium p-2" onClick={() => setMobileMenuOpen(false)}>Preços</a>
                    <button
                        className="text-sm font-medium p-2 text-left w-full"
                        onClick={() => { setMobileMenuOpen(false); router.push('/demo'); }}
                    >
                        Demonstração
                    </button>
                    <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); onLoginClick('login'); }}>Entrar</Button>
                    <Button className="w-full" onClick={() => { setMobileMenuOpen(false); onLoginClick('register'); }}>Começar Grátis</Button>
                </motion.div>
            )}
        </header>
    );
}
