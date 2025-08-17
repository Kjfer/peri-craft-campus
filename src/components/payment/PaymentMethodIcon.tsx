import { CreditCard, Smartphone, Wallet } from "lucide-react";

export interface PaymentMethodIconProps {
  method: string;
  className?: string;
}

export function PaymentMethodIcon({ method, className = "w-6 h-6" }: PaymentMethodIconProps) {
  const iconClass = `${className} flex-shrink-0`;

  switch (method.toLowerCase()) {
    case 'paypal':
      return (
        <div className={`${iconClass} bg-blue-600 rounded text-white flex items-center justify-center`}>
          <span className="text-xs font-bold">PP</span>
        </div>
      );
    
    case 'mercadopago':
      return (
        <div className={`${iconClass} bg-blue-500 rounded text-white flex items-center justify-center`}>
          <Wallet className="w-4 h-4" />
        </div>
      );
    
    case 'googlepay':
      return (
        <div className={`${iconClass} bg-gray-800 rounded text-white flex items-center justify-center`}>
          <Smartphone className="w-4 h-4" />
        </div>
      );
    
    case 'yape':
      return (
        <div className={`${iconClass} bg-purple-600 rounded text-white flex items-center justify-center`}>
          <span className="text-xs font-bold">Y</span>
        </div>
      );
    
    case 'plin':
      return (
        <div className={`${iconClass} bg-green-600 rounded text-white flex items-center justify-center`}>
          <span className="text-xs font-bold">P</span>
        </div>
      );
    
    case 'card':
    case 'credit_card':
    case 'debit_card':
      return <CreditCard className={iconClass} />;
    
    default:
      return <CreditCard className={iconClass} />;
  }
}

export function PaymentMethodBadge({ method, className = "" }: PaymentMethodIconProps) {
  const getMethodInfo = (method: string) => {
    switch (method.toLowerCase()) {
      case 'paypal':
        return { name: 'PayPal', color: 'bg-blue-600' };
      case 'mercadopago':
        return { name: 'MercadoPago', color: 'bg-blue-500' };
      case 'googlepay':
        return { name: 'Google Pay', color: 'bg-gray-800' };
      case 'yape':
        return { name: 'Yape', color: 'bg-purple-600' };
      case 'plin':
        return { name: 'Plin', color: 'bg-green-600' };
      case 'card':
      case 'credit_card':
        return { name: 'Tarjeta', color: 'bg-gray-600' };
      default:
        return { name: method, color: 'bg-gray-500' };
    }
  };

  const info = getMethodInfo(method);

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm ${info.color} ${className}`}>
      <PaymentMethodIcon method={method} className="w-4 h-4" />
      {info.name}
    </span>
  );
}
