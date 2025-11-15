'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck, 
  Settings, 
  ChevronRight,
  Award,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Sidebar({ activeView, setActiveView, pendingCount = 0 }) {
  const [resultsExpanded, setResultsExpanded] = useState(true);

  const menuItems = [
    { id: 'painel', label: 'Painel', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'gabaritos', label: 'Gabaritos', icon: FileText },
    { id: 'habilidades', label: 'Habilidades', icon: Award },
    { id: 'perfis', label: 'Perfis de Avaliação', icon: Award },
    { 
      id: 'resultados', 
      label: 'Resultados', 
      icon: ClipboardCheck,
      expandable: true,
      children: [
        { id: 'pendentes', label: 'Aguardando Validação', count: pendingCount },
        { id: 'concluidas', label: 'Avaliações Concluídas' }
      ]
    }
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen flex flex-col">
      <div className="p-4">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Corretor 80/20</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Plataforma de Correção IA</p>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <div key={item.id}>
              {item.expandable ? (
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-between',
                      (activeView === 'pendentes' || activeView === 'concluidas') && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    )}
                    onClick={() => setResultsExpanded(!resultsExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className={cn(
                      'h-4 w-4 transition-transform',
                      resultsExpanded && 'rotate-90'
                    )} />
                  </Button>
                  {resultsExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children?.map((child) => (
                        <Button
                          key={child.id}
                          variant="ghost"
                          className={cn(
                            'w-full justify-start text-sm',
                            activeView === child.id && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          )}
                          onClick={() => setActiveView(child.id)}
                        >
                          {child.label}
                          {child.count > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                              {child.count}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start',
                    activeView === item.id && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  )}
                  onClick={() => setActiveView(item.id)}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Fixed Settings at Bottom */}
      <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start',
            activeView === 'configuracoes' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
          )}
          onClick={() => setActiveView('configuracoes')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </Button>
      </div>
    </div>
  );
}
