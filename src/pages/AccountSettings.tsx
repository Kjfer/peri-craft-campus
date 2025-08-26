import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Lock, User, Shield, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AccountSettings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [deleteData, setDeleteData] = useState({
    password: ""
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas nuevas no coinciden.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe tener al menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido cambiada exitosamente."
        });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo cambiar la contraseña.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al cambiar la contraseña.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          password: deleteData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Cuenta desactivada",
          description: "Tu cuenta ha sido desactivada exitosamente."
        });
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo desactivar la cuenta.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al desactivar la cuenta.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setDeleteData({ password: "" });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuración de Cuenta</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y configuración de seguridad
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="danger">Zona Peligrosa</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Esta información se estableció durante el registro y no puede ser modificada por razones de seguridad.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={profile?.full_name || ""} 
                      disabled 
                      className="bg-muted"
                    />
                    <Badge variant="secondary">No editable</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={user?.email || ""} 
                      disabled 
                      className="bg-muted"
                    />
                    <Badge variant="secondary">No editable</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={profile?.phone || "No especificado"} 
                      disabled 
                      className="bg-muted"
                    />
                    <Badge variant="secondary">No editable</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>País</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={profile?.country || "No especificado"} 
                      disabled 
                      className="bg-muted"
                    />
                    <Badge variant="secondary">No editable</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={profile?.role || "student"} 
                      disabled 
                      className="bg-muted"
                    />
                    <Badge variant="outline">{profile?.role === 'admin' ? 'Administrador' : profile?.role === 'instructor' ? 'Instructor' : 'Estudiante'}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Fecha de Registro</Label>
                  <Input 
                    value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES') : "No disponible"} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Nota:</strong> Los datos personales no pueden modificarse después del registro para mantener 
                  la integridad y seguridad de tu cuenta. Si necesitas actualizar esta información, 
                  contacta al equipo de soporte.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuración de Seguridad
              </CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 px-0"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 px-0"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmar Nueva Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 px-0"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Actualizar Contraseña
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zona Peligrosa
              </CardTitle>
              <CardDescription>
                Estas acciones son irreversibles. Procede con precaución.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Desactivar Cuenta</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Una vez que desactives tu cuenta, perderás acceso a todos tus cursos y datos. 
                  Esta acción marcará tu cuenta como inactiva pero no eliminará completamente tus datos.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Desactivar Mi Cuenta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>Esta acción desactivará tu cuenta permanentemente.</p>
                        <p>Para confirmar, ingresa tu contraseña:</p>
                        <Input
                          type="password"
                          placeholder="Tu contraseña"
                          value={deleteData.password}
                          onChange={(e) => setDeleteData({ password: e.target.value })}
                        />
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleAccountDelete}
                        disabled={!deleteData.password || isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sí, desactivar cuenta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}