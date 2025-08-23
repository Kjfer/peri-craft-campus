import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Shield, AlertTriangle, Info } from "lucide-react";

interface SecurityAlertProps {
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function SecurityAlert({
  type,
  title,
  message,
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000
}: SecurityAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const getIcon = () => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
      default:
        return 'default';
    }
  };

  const getBadgeVariant = () => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
      default:
        return 'outline';
    }
  };

  if (!visible) return null;

  return (
    <Alert variant={getVariant()} className="relative">
      {getIcon()}
      <AlertTitle className="flex items-center space-x-2">
        <span>{title}</span>
        <Badge variant={getBadgeVariant()} className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {type.toUpperCase()}
        </Badge>
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}