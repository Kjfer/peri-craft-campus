import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  payment_confirmations: boolean;
  subscription_renewals: boolean;
  course_updates: boolean;
  promotional_offers: boolean;
  system_announcements: boolean;
}

interface Notification {
  id: string;
  type: 'payment' | 'subscription' | 'course' | 'system' | 'promotional';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  action_label?: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false,
    payment_confirmations: true,
    subscription_renewals: true,
    course_updates: true,
    promotional_offers: false,
    system_announcements: true
  });
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');

  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updateNotificationSettings = async (newSettings: NotificationSettings) => {
    setSettingsLoading(true);
    
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: newSettings })
      });

      if (response.ok) {
        setSettings(newSettings);
        toast({
          title: 'Configuración guardada',
          description: 'Tus preferencias de notificación se han actualizado',
          variant: 'default'
        });
      } else {
        throw new Error('Error updating settings');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las configuraciones',
        variant: 'destructive'
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        toast({
          title: 'Marcadas como leídas',
          description: 'Todas las notificaciones han sido marcadas como leídas',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron marcar todas las notificaciones',
        variant: 'destructive'
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        toast({
          title: 'Notificación eliminada',
          description: 'La notificación se ha eliminado correctamente',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la notificación',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💳';
      case 'subscription':
        return '📋';
      case 'course':
        return '📚';
      case 'system':
        return '⚙️';
      case 'promotional':
        return '🎉';
      default:
        return '📢';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSettingsChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    updateNotificationSettings(newSettings);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Centro de Notificaciones</h1>
        <p className="text-muted-foreground mt-2">
          Administra tus notificaciones y preferencias de comunicación
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'notifications'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Notificaciones
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Configuración
        </button>
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Actions */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
              </p>
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Marcar todas como leídas
              </Button>
            </div>
          )}

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4">📢</div>
                <h3 className="text-xl font-semibold mb-2">No tienes notificaciones</h3>
                <p className="text-muted-foreground">
                  Cuando tengas nuevas notificaciones aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{notification.title}</h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(notification.created_at)}
                            </p>
                            <div className="flex items-center space-x-2">
                              {notification.action_url && notification.action_label && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    if (notification.action_url) {
                                      window.open(notification.action_url, '_blank');
                                    }
                                  }}
                                >
                                  {notification.action_label}
                                </Button>
                              )}
                              {!notification.read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  Marcar leída
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificación</CardTitle>
              <p className="text-sm text-muted-foreground">
                Elige cómo y cuándo quieres recibir notificaciones
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Canales de comunicación */}
              <div>
                <h4 className="font-medium mb-3">Canales de Comunicación</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificaciones por email</p>
                      <p className="text-sm text-muted-foreground">
                        Recibe notificaciones en tu correo electrónico
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingsChange('email_notifications', !settings.email_notifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={settingsLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificaciones SMS</p>
                      <p className="text-sm text-muted-foreground">
                        Recibe notificaciones importantes por SMS
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingsChange('sms_notifications', !settings.sms_notifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.sms_notifications ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={settingsLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.sms_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tipos de notificación */}
              <div>
                <h4 className="font-medium mb-3">Tipos de Notificación</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Confirmaciones de pago</p>
                      <p className="text-sm text-muted-foreground">
                        Notificaciones sobre pagos procesados y confirmados
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingsChange('payment_confirmations', !settings.payment_confirmations)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.payment_confirmations ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={settingsLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.payment_confirmations ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Renovaciones de suscripción</p>
                      <p className="text-sm text-muted-foreground">
                        Recordatorios y confirmaciones de renovaciones
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingsChange('subscription_renewals', !settings.subscription_renewals)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.subscription_renewals ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={settingsLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.subscription_renewals ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Actualizaciones de cursos</p>
                      <p className="text-sm text-muted-foreground">
                        Nuevas lecciones, materiales y anuncios de cursos
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingsChange('course_updates', !settings.course_updates)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.course_updates ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={settingsLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.course_updates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ofertas promocionales</p>
                      <p className="text-sm text-muted-foreground">
                        Descuentos especiales y ofertas limitadas
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingsChange('promotional_offers', !settings.promotional_offers)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.promotional_offers ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={settingsLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.promotional_offers ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Anuncios del sistema</p>
                      <p className="text-sm text-muted-foreground">
                        Mantenimientos, actualizaciones y avisos importantes
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingsChange('system_announcements', !settings.system_announcements)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.system_announcements ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={settingsLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.system_announcements ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {settingsLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Guardando configuración...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}