import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cartAPI, courseAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  id: string;
  course_id: string;
  course: {
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string;
    instructor_name: string;
    level: string;
    duration_hours: number;
  };
  added_at: string;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  total: number;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

interface CartContextType {
  state: CartState;
  addToCart: (courseId: string) => Promise<void>;
  removeFromCart: (courseId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (courseId: string) => boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ITEMS':
      const total = action.payload.reduce((sum, item) => sum + item.course.price, 0);
      return { ...state, items: action.payload, total };
    case 'ADD_ITEM':
      const newItems = [...state.items, action.payload];
      const newTotal = newItems.reduce((sum, item) => sum + item.course.price, 0);
      return { ...state, items: newItems, total: newTotal };
    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter(item => item.course_id !== action.payload);
      const updatedTotal = filteredItems.reduce((sum, item) => sum + item.course.price, 0);
      return { ...state, items: filteredItems, total: updatedTotal };
    case 'CLEAR_CART':
      return { ...state, items: [], total: 0 };
    default:
      return state;
  }
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    loading: false,
    total: 0,
  });

  const { user } = useAuth();
  const { toast } = useToast();

  // Load cart items when user changes
  useEffect(() => {
    if (user) {
      refreshCart();
    } else {
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [user]);

  const refreshCart = async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('🛒 Refreshing cart for user:', user.id);

      // Use localStorage as primary storage since API cart is not available
      const cartKey = `cart_items_${user.id}`;
      const savedCart = localStorage.getItem(cartKey);
      
      if (savedCart) {
        try {
          const cartItems = JSON.parse(savedCart);
          dispatch({ type: 'SET_ITEMS', payload: cartItems });
          console.log('🛒 Loaded cart from localStorage:', cartItems.length, 'items');
        } catch (e) {
          console.error('Error parsing cart from localStorage:', e);
          localStorage.removeItem(cartKey);
          dispatch({ type: 'SET_ITEMS', payload: [] });
        }
      } else {
        dispatch({ type: 'SET_ITEMS', payload: [] });
      }
    } catch (error) {
      console.error('Error refreshing cart:', error);
      dispatch({ type: 'SET_ITEMS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveCartToLocalStorage = (items: CartItem[]) => {
    if (user) {
      const cartKey = `cart_items_${user.id}`;
      localStorage.setItem(cartKey, JSON.stringify(items));
    }
  };

  const addToCart = async (courseId: string) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para agregar cursos al carrito.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🛒 Adding course to cart:', courseId);
      
      // Check if already in cart
      if (isInCart(courseId)) {
        toast({
          title: "Ya en el carrito",
          description: "Este curso ya está en tu carrito.",
          variant: "destructive",
        });
        return;
      }

      // Validate with Supabase - check if user is already enrolled
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (existingEnrollment) {
        toast({
          title: "Ya estás inscrito",
          description: "Ya estás inscrito en este curso. Puedes acceder desde tu dashboard.",
          variant: "destructive",
        });
        return;
      }

      // Check if user has pending or completed order for this course
      const { data: existingOrder } = await supabase
        .from('orders')
        .select(`
          id,
          payment_status,
          order_items!inner(course_id)
        `)
        .eq('user_id', user.id)
        .in('payment_status', ['pending', 'completed'])
        .eq('order_items.course_id', courseId)
        .maybeSingle();

      if (existingOrder) {
        if (existingOrder.payment_status === 'completed') {
          toast({
            title: "Ya tienes este curso",
            description: "Ya compraste este curso. Puedes acceder desde tu dashboard.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Orden pendiente",
            description: "Ya tienes una orden pendiente para este curso. Completa el pago para continuar.",
            variant: "destructive",
          });
        }
        return;
      }

      // Get course details from Supabase
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('is_active', true)
        .single();

      if (courseError || !course) {
        throw new Error('Course not found');
      }
      
      // Create cart item
      const newCartItem: CartItem = {
        id: `cart_${Date.now()}_${courseId}`,
        course_id: courseId,
        course: {
          id: course.id,
          title: course.title,
          price: course.price || 0,
          thumbnail_url: course.thumbnail_url,
          instructor_name: course.instructor_name,
          level: course.level,
          duration_hours: course.duration_hours || 0,
        },
        added_at: new Date().toISOString(),
      };

      // Add to state first for immediate UI update
      dispatch({ type: 'ADD_ITEM', payload: newCartItem });
      
      // Save to localStorage after state update
      setTimeout(() => {
        saveCartToLocalStorage([...state.items, newCartItem]);
      }, 0);

      toast({
        title: "¡Agregado al carrito!",
        description: `${course.title} se agregó a tu carrito.`,
      });
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      
      let errorMessage = "No se pudo agregar el curso al carrito.";
      
      if (error.message?.includes('Ya estás inscrito')) {
        errorMessage = "Ya estás inscrito en este curso.";
      } else if (error.message?.includes('orden pendiente')) {
        errorMessage = "Ya tienes una orden pendiente para este curso.";
      } else if (error.message?.includes('Course not found')) {
        errorMessage = "No se pudo encontrar el curso.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (courseId: string) => {
    if (!user) return;

    try {
      console.log('🛒 Removing course from cart:', courseId);
      
      // Try API first
      try {
        const response = await cartAPI.removeItem(courseId);
        console.log('🛒 Remove from cart API response:', response);

        if (response.success) {
          dispatch({ type: 'REMOVE_ITEM', payload: courseId });
          toast({
            title: "Eliminado del carrito",
            description: "El curso se eliminó de tu carrito.",
          });
          return;
        }
      } catch (apiError) {
        console.log('🛒 API not available, using localStorage fallback');
      }

      // Fallback: Remove from localStorage
      dispatch({ type: 'REMOVE_ITEM', payload: courseId });
      
      // Save to localStorage
      const updatedItems = state.items.filter(item => item.course_id !== courseId);
      saveCartToLocalStorage(updatedItems);

      toast({
        title: "Eliminado del carrito",
        description: "El curso se eliminó de tu carrito.",
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el curso del carrito.",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      console.log('🛒 Clearing cart for user:', user.id);
      
      // Try API first
      try {
        const response = await cartAPI.clearCart();
        console.log('🛒 Clear cart API response:', response);

        if (response.success) {
          dispatch({ type: 'CLEAR_CART' });
          return;
        }
      } catch (apiError) {
        console.log('🛒 API not available, using localStorage fallback');
      }

      // Fallback: Clear localStorage
      dispatch({ type: 'CLEAR_CART' });
      
      const cartKey = `cart_items_${user.id}`;
      localStorage.removeItem(cartKey);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const isInCart = (courseId: string): boolean => {
    return state.items.some(item => item.course_id === courseId);
  };

  return (
    <CartContext.Provider
      value={{
        state,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
