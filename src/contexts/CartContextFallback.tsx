import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { courseAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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

  const getCartKey = () => `cart_items_${user?.id || 'anonymous'}`;

  const refreshCart = async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('🛒 Refreshing cart for user:', user.id);

      // For now, use localStorage as a fallback until database tables are set up
      const cartKey = getCartKey();
      const savedCart = localStorage.getItem(cartKey);
      
      if (savedCart) {
        try {
          const cartItems = JSON.parse(savedCart);
          dispatch({ type: 'SET_ITEMS', payload: cartItems });
          console.log('🛒 Loaded cart from localStorage:', cartItems.length, 'items');
        } catch (e) {
          console.error('Error parsing cart from localStorage:', e);
          localStorage.removeItem(cartKey);
        }
      }
    } catch (error) {
      console.error('Error refreshing cart:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveCartToLocalStorage = (items: CartItem[]) => {
    if (user) {
      const cartKey = getCartKey();
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

      // Get course details
      const courseResponse = await courseAPI.getById(courseId);
      console.log('🛒 Course details:', courseResponse);

      if (!courseResponse || !courseResponse.course) {
        throw new Error('Course not found');
      }

      const course = courseResponse.course;
      
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

      // Add to state
      dispatch({ type: 'ADD_ITEM', payload: newCartItem });
      
      // Save to localStorage
      const updatedItems = [...state.items, newCartItem];
      saveCartToLocalStorage(updatedItems);

      toast({
        title: "¡Agregado al carrito!",
        description: `${course.title} se agregó a tu carrito.`,
      });
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      
      let errorMessage = "No se pudo agregar el curso al carrito.";
      
      if (error.message?.includes('Course not found')) {
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
      
      dispatch({ type: 'CLEAR_CART' });
      
      // Clear localStorage
      const cartKey = getCartKey();
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
