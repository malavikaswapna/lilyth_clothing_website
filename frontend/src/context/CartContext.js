import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext();

const initialState = {
  cart: null,
  items: [],
  savedItems: [],
  itemCount: 0,
  subtotal: 0,
  loading: false,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CART':
      return {
        ...state,
        cart: action.payload,
        items: action.payload?.items || [],
        savedItems: action.payload?.savedItems || [],
        itemCount: action.payload?.itemCount || 0,
        subtotal: action.payload?.subtotal || 0,
        loading: false,
      };
    case 'CLEAR_CART':
      return {
        ...state,
        cart: null,
        items: [],
        savedItems: [],
        itemCount: 0,
        subtotal: 0,
        loading: false,
      };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // load cart only when user is authenticated(auth is not loading)
  useEffect(() => {
    if (!authLoading) { 
      if (isAuthenticated) {
        loadCart();
      } else {
        dispatch({ type: 'CLEAR_CART' });
      }
    }
  }, [isAuthenticated, authLoading]);

  const loadCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await cartAPI.getCart();
      dispatch({ type: 'SET_CART', payload: response.data.cart });
    } catch (error) {
      console.error('Failed to load cart:', error);
      // don't show error toast for 401s(user not logged in)
      if (error.response?.status !== 401) {
        toast.error('Failed to load cart');
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addToCart = async (productId, size, color, quantity = 1) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to cart');
      return { success: false, message: 'Not authenticated' };
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await cartAPI.addToCart({
        productId,
        size,
        color,
        quantity,
      });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Item added to cart!');
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Failed to add item to cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  const updateCartItem = async (productId, size, color, quantity) => {
    if (!isAuthenticated) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await cartAPI.updateCartItem({
        productId,
        size,
        color,
        quantity,
      });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Failed to update item';
      toast.error(message);
      return { success: false, message };
    }
  };

  const removeFromCart = async (productId, size, color) => {
    if (!isAuthenticated) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await cartAPI.removeFromCart({
        productId,
        size,
        color,
      });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Item removed from cart');
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Failed to remove item';
      toast.error(message);
      return { success: false, message };
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await cartAPI.clearCart();
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Cart cleared');
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Failed to clear cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  const saveForLater = async (productId, size, color) => {
    if (!isAuthenticated) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await cartAPI.saveForLater({
        productId,
        size,
        color,
      });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Item saved for later');
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Failed to save item';
      toast.error(message);
      return { success: false, message };
    }
  };

  const moveToCart = async (productId, size, color) => {
    if (!isAuthenticated) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await cartAPI.moveToCart({
        productId,
        size,
        color,
      });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Item moved to cart');
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Failed to move item';
      toast.error(message);
      return { success: false, message };
    }
  };

  const getCartItemCount = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    ...state,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    saveForLater,
    moveToCart,
    loadCart,
    getCartItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};