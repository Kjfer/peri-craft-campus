import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Shield, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string;
  target_user_id?: string;
  event_data?: any;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

interface SecurityEventWithUserInfo extends SecurityEvent {
  user_email?: string;
  target_user_email?: string;
}

export function SecurityMonitor() {
  const [events, setEvents] = useState<SecurityEventWithUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      
      const { data: securityEvents, error } = await supabase
        .from('security_events')
        .select(`
          id,
          event_type,
          user_id,
          target_user_id,
          event_data,
          ip_address,
          user_agent,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user emails for better display
      const eventsWithUserInfo = await Promise.all(
        (securityEvents || []).map(async (event) => {
          const eventWithInfo: SecurityEventWithUserInfo = { 
            ...event,
            ip_address: event.ip_address as string | null,
            user_agent: event.user_agent as string | null
          };
          
          // Get user email
          if (event.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', event.user_id)
              .single();
            eventWithInfo.user_email = profile?.email;
          }
          
          // Get target user email  
          if (event.target_user_id) {
            const { data: targetProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', event.target_user_id)
              .single();
            eventWithInfo.target_user_email = targetProfile?.email;
          }
          
          return eventWithInfo;
        })
      );

      setEvents(eventsWithUserInfo);
    } catch (error) {
      console.error('Error fetching security events:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos de seguridad",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'role_change':
      case 'role_assignment':
        return <User className="h-4 w-4" />;
      case 'login_failed':
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'role_change':
        return <Badge variant="destructive">{eventType}</Badge>;
      case 'role_assignment':
        return <Badge variant="secondary">{eventType}</Badge>;
      case 'login_failed':
        return <Badge variant="outline">{eventType}</Badge>;
      default:
        return <Badge variant="default">{eventType}</Badge>;
    }
  };

  const formatEventData = (eventData: any) => {
    if (!eventData) return 'N/A';
    
    if (eventData.old_role && eventData.new_role) {
      return `${eventData.old_role} → ${eventData.new_role}`;
    }
    
    if (eventData.new_role) {
      return `Asignado: ${eventData.new_role}`;
    }
    
    return JSON.stringify(eventData, null, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Monitor de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Monitor de Seguridad
        </CardTitle>
        <CardDescription>
          Eventos de seguridad recientes y cambios críticos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Usuario Objetivo</TableHead>
              <TableHead>Detalles</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No hay eventos de seguridad registrados
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEventTypeIcon(event.event_type)}
                      {getEventTypeBadge(event.event_type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {event.user_email || 'Sistema'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {event.target_user_email || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs max-w-32 truncate">
                      {formatEventData(event.event_data)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString('es-ES')}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}