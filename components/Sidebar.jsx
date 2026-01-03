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
  BarChart3,
  GraduationCap,
  BotIcon
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function AppSidebar({ activeView, setActiveView, pendingCount = 0 }) {
  const [resultsExpanded, setResultsExpanded] = useState(true);

  const menuItems = [
    {
      id: 'painel',
      label: 'Painel',
      icon: LayoutDashboard,
      description: 'Upload e correção de provas'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Métricas e relatórios'
    },
    {
      id: 'corretor-ia',
      label: 'CorregIA',
      icon: BotIcon,
      description: 'Correção automática e instantânea de provas de múltipla escolha. Para questões discursivas, receba sugestões inteligentes de pontuação.'
    },
    {
      id: 'gabaritos',
      label: 'Gabaritos',
      icon: FileText,
      description: 'Gerenciar gabaritos'
    },
    {
      id: 'habilidades',
      label: 'Habilidades',
      icon: Award,
      description: 'Gerenciar habilidades'
    },
    {
      id: 'perfis',
      label: 'Perfis de Avaliação',
      icon: GraduationCap,
      description: 'Perfis de correção'
    },
    {
      id: 'resultados',
      label: 'Resultados',
      icon: ClipboardCheck,
      description: 'Avaliações corrigidas',
      expandable: true,
      children: [
        {
          id: 'pendentes',
          label: 'Aguardando Validação',
          count: pendingCount,
          description: 'Avaliações pendentes'
        },
        {
          id: 'concluidas',
          label: 'Avaliações Concluídas',
          description: 'Histórico de avaliações'
        }
      ]
    }
  ];

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-transparent">
            <Image src="/imagens/favicon_logo.png" alt="CorregIA" width={30} height={30} />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">CorregIA</span>
            <span className="truncate text-xs text-sidebar-foreground/70">Plataforma CorregIA</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  {item.expandable ? (
                    <>
                      <SidebarMenuButton
                        tooltip={item.description}
                        onClick={() => setResultsExpanded(!resultsExpanded)}
                        isActive={activeView === 'pendentes' || activeView === 'concluidas'}
                        className="flex items-center"
                      >
                        <item.icon />
                        <span className="truncate flex-1">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 transition-transform shrink-0',
                            resultsExpanded && 'rotate-90'
                          )}
                        />
                      </SidebarMenuButton>
                      {resultsExpanded && (
                        <SidebarMenuSub>
                          {item.children?.map((child) => (
                            <SidebarMenuSubItem key={child.id}>
                              <SidebarMenuSubButton
                                onClick={() => setActiveView(child.id)}
                                isActive={activeView === child.id}
                                className="flex items-center gap-2 w-full"
                              >
                                <span className="truncate flex-1">{child.label}</span>
                                {child.count !== undefined && child.count > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-auto h-5 min-w-5 px-1.5 text-xs flex items-center justify-center shrink-0"
                                  >
                                    {child.count}
                                  </Badge>
                                )}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </>
                  ) : (
                    <SidebarMenuButton
                      tooltip={item.description}
                      onClick={() => setActiveView(item.id)}
                      isActive={activeView === item.id}
                      className="flex items-center"
                    >
                      <item.icon />
                      <span className="truncate flex-1">{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Configurações"
              onClick={() => setActiveView('configuracoes')}
              isActive={activeView === 'configuracoes'}
              className="flex items-center"
            >
              <Settings />
              <span className="truncate flex-1">Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
