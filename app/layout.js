import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CorregIA - Correção de Provas com Inteligência Artificial | Economize Tempo',
  description: 'Plataforma de correção automática de provas com IA. Economize até 80% do tempo corrigindo avaliações. OCR avançado, feedback instantâneo e dashboard completo para professores.',
  keywords: [
    'correção de provas',
    'correção automática',
    'inteligência artificial para professores',
    'IA educação',
    'corretor automático',
    'OCR manuscrito',
    'plataforma educacional',
    'correção com IA',
    'economizar tempo professor',
    'avaliação automática',
    'feedback automático alunos',
    'gestão de provas'
  ],
  authors: [{ name: 'CorregIA' }],
  creator: 'CorregIA',
  publisher: 'CorregIA',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CorregIA - Correção de Provas com IA',
    description: 'Economize até 80% do tempo corrigindo provas. Plataforma com IA, OCR e feedback automático para professores.',
    url: '/',
    siteName: 'CorregIA',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CorregIA - Correção de Provas com IA',
    description: 'Economize até 80% do tempo corrigindo provas com Inteligência Artificial',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/imagens/favicon_logo.png',
    shortcut: '/imagens/favicon_logo.png',
    apple: '/imagens/favicon_logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
