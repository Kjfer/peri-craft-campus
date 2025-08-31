import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleChangeDialog } from "@/components/admin/RoleChangeDialog";

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'student' | 'admin' | 'instructor';
  created_at: string;
  avatar_url?: string;
  phone?: string;
  country?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    user?: User;
    newRole?: 'student' | 'admin' | 'instructor';
  }>({ open: false });
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      if (roleFilter !== "all") {
        query = query.eq('role', roleFilter as 'student' | 'admin' | 'instructor');
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChangeRequest = (user: User, newRole: 'student' | 'admin' | 'instructor') => {
    if (user.role === newRole) return; // No change needed
    
    setRoleChangeDialog({
      open: true,
      user,
      newRole
    });
  };

  const confirmRoleChange = async (reason?: string) => {
    if (!roleChangeDialog.user || !roleChangeDialog.newRole) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: roleChangeDialog.newRole })
        .eq('user_id', roleChangeDialog.user.user_id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Éxito",
        description: `Rol actualizado a ${roleChangeDialog.newRole} correctamente`
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'instructor': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'instructor': return 'Instructor';
      case 'student': return 'Estudiante';
      default: return role;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra todos los usuarios de la plataforma
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="student">Estudiantes</SelectItem>
                  <SelectItem value="instructor">Instructores</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios ({users.length})</CardTitle>
            <CardDescription>
              Lista de todos los usuarios registrados en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{user.full_name || 'Sin nombre'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRoleChangeRequest(user, user.role === 'admin' ? 'student' : 'admin')}
                      >
                        {user.role === 'admin' ? 'Remover Admin' : 'Hacer Admin'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <RoleChangeDialog
        open={roleChangeDialog.open}
        onOpenChange={(open) => setRoleChangeDialog({ ...roleChangeDialog, open })}
        userName={roleChangeDialog.user?.full_name || roleChangeDialog.user?.email || ''}
        currentRole={roleChangeDialog.user?.role || ''}
        newRole={roleChangeDialog.newRole || ''}
        onConfirm={confirmRoleChange}
      />
    </AdminLayout>
  );
}