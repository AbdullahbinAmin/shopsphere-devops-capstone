/**
 * ShopSphere — Cart Context
 */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { cartAPI } from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const initialCart = { items: [], itemCount: 0, subtotal: 0, savings: 0, estimatedTotal: 0, isLoading: false };

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_CART': return { ...action.payload, isLoading: false };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'CLEAR': return { ...initialCart };
    default: return state;
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);
  const { isAuthenticated } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) { dispatch({ type: 'CLEAR' }); return; }
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const res = await cartAPI.getCart();
      dispatch({ type: 'SET_CART', payload: res.data });
    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = useCallback(async (productId, quantity = 1) => {
    const res = await cartAPI.addItem({ productId, quantity });
    dispatch({ type: 'SET_CART', payload: res.data });
    return res.data;
  }, []);

  const updateItem = useCallback(async (productId, quantity) => {
    const res = await cartAPI.updateItem(productId, quantity);
    dispatch({ type: 'SET_CART', payload: res.data });
  }, []);

  const removeItem = useCallback(async (productId) => {
    const res = await cartAPI.removeItem(productId);
    dispatch({ type: 'SET_CART', payload: res.data });
  }, []);

  const clearCart = useCallback(async () => {
    await cartAPI.clearCart();
    dispatch({ type: 'CLEAR' });
  }, []);

  return (
    <CartContext.Provider value={{ cart, fetchCart, addItem, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
