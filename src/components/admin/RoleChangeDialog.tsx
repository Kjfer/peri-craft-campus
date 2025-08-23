import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  currentRole: string;
  newRole: string;
  onConfirm: (reason?: string) => void;
}

export function RoleChangeDialog({
  open,
  onOpenChange,
  userName,
  currentRole,
  newRole,
  onConfirm
}: RoleChangeDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  const isElevatingPrivileges = () => {
    const roleHierarchy = { student: 0, instructor: 1, admin: 2 };
    return roleHierarchy[newRole as keyof typeof roleHierarchy] > 
           roleHierarchy[currentRole as keyof typeof roleHierarchy];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span>Confirmar Cambio de Rol</span>
          </DialogTitle>
          <DialogDescription>
            Esta acción modificará los permisos del usuario. Esta operación será registrada en el log de auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isElevatingPrivileges() && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atención:</strong> Está otorgando privilegios elevados a este usuario.
                Asegúrese de que esta acción está autorizada.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Usuario:</Label>
            <p className="text-sm text-muted-foreground">{userName}</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Rol Actual:</Label>
              <Badge variant="outline">{currentRole}</Badge>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground">→</span>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Nuevo Rol:</Label>
              <Badge variant="secondary">{newRole}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Razón del cambio (opcional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Describa la razón de este cambio de rol..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <strong>Nota:</strong> Este cambio será registrado en el sistema de auditoría junto con su ID de usuario, 
            la fecha/hora del cambio y la razón proporcionada (si la hay).
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant={isElevatingPrivileges() ? "destructive" : "default"}
          >
            {loading ? "Procesando..." : "Confirmar Cambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}