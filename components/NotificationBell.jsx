'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/notificacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notificacoes || []);
        setUnreadCount(data.notificacoes?.filter(n => !n.lida).length || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/notificacoes/${id}/lida`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/notificacoes', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Todas as notificações marcadas como lidas');
        loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearAll = async () => {
    if (!confirm('Deseja excluir todas as notificações?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/notificacoes', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Notificações excluídas');
        loadNotifications();
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.lida);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-in zoom-in duration-300">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl overflow-hidden border-blue-100 shadow-xl" align="end">
        <div className="p-4 border-b flex items-center justify-between bg-blue-50/50">
          <h3 className="font-bold text-sm text-blue-900">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-transparent"
              onClick={markAllAsRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {unreadNotifications.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Bell className="h-6 w-6 text-blue-200" />
              </div>
              <p className="text-sm text-gray-500">Nenhuma notificação nova</p>
              {notifications.length > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-gray-400"
                  onClick={clearAll}
                >
                  Limpar histórico
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-blue-50">
              {unreadNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 cursor-pointer hover:bg-blue-200 transition-all group relative"
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm text-blue-900 leading-tight">
                        {notif.mensagem}
                      </p>
                      <p className="text-[10px] text-blue-400">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      Marcar como lida
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && unreadNotifications.length > 0 && (
          <div className="p-2 border-t text-center">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50"
              onClick={clearAll}
            >
              Excluir todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
