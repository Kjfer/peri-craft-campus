import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AddToCartButtonProps {
  courseId: string;
  price: number;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export default function AddToCartButton({
  courseId,
  price,
  className = "",
  variant = "default",
  size = "default",
  disabled = false
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const { addToCart, isInCart, state } = useCart();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  
  const isInCartAlready = isInCart(courseId);
  const isLoading = state.loading || isAdding;

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para agregar cursos al carrito.",
        variant: "destructive",
      });
      return;
    }

    if (isInCartAlready) {
      toast({
        title: "Ya en el carrito",
        description: "Este curso ya está en tu carrito.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(courseId);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (isInCartAlready) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${className} border-green-200 text-green-700 bg-green-50 hover:bg-green-100`}
        disabled
      >
        <Check className="w-4 h-4 mr-2" />
        En el carrito
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleAddToCart}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Agregando...
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Agregar al carrito
        </>
      )}
    </Button>
  );
}