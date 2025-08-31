import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface SecurePasswordFormProps {
  onPasswordChanged?: () => void;
}

export function SecurePasswordForm({ onPasswordChanged }: SecurePasswordFormProps) {
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

  const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
      return { isValid: false, message: "La contraseña debe tener al menos 8 caracteres" };
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        isValid: false, 
        message: "La contraseña debe contener al menos una letra minúscula, una mayúscula y un número" 
      };
    }
    
    return { isValid: true };
  };

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

    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Contraseña inválida",
        description: passwordValidation.message,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use Supabase's secure password update method
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente."
      });
      
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      onPasswordChanged?.();
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar la contraseña.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        <p className="text-xs text-muted-foreground">
          Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números
        </p>
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
  );
}