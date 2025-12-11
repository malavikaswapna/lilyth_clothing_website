// src/context/GuestContext.js

import React, { createContext, useContext, useReducer, useEffect } from "react";
import { guestAPI } from "../services/api";
import toast from "react-hot-toast";

const GuestContext = createContext();

const initialState = {
  guestId: localStorage.getItem("guestId") || null,
  guestCart: null,
  guestItems: [],
  guestItemCount: 0,
  guestSubtotal: 0,
  guestExpiresAt: localStorage.getItem("guestExpiresAt") || null,
  isGuestSession: !!localStorage.getItem("guestId"),
  loading: false,
};

const guestReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "INIT_GUEST_SESSION":
      return {
        ...state,
        guestId: action.payload.guestId,
        guestExpiresAt: action.payload.expiresAt,
        isGuestSession: true,
        loading: false,
      };

    case "SET_GUEST_CART":
      return {
        ...state,
        guestCart: action.payload,
        guestItems: action.payload?.items || [],
        guestItemCount: action.payload?.itemCount || 0,
        guestSubtotal: action.payload?.subtotal || 0,
        loading: false,
      };

    case "CLEAR_GUEST_SESSION":
      return {
        ...initialState,
        guestId: null,
        isGuestSession: false,
      };

    // Clear guest cart action
    case "CLEAR_GUEST_CART":
      return {
        ...state,
        guestCart: null,
        guestItems: [],
        guestItemCount: 0,
        guestSubtotal: 0,
      };

    default:
      return state;
  }
};

export const GuestProvider = ({ children }) => {
  const [state, dispatch] = useReducer(guestReducer, initialState);

  // Check if guest session exists on mount
  useEffect(() => {
    const guestId = localStorage.getItem("guestId");
    const expiresAt = localStorage.getItem("guestExpiresAt");

    if (guestId && expiresAt) {
      // Check if session is expired
      if (new Date(expiresAt) < new Date()) {
        clearGuestSession();
      } else {
        loadGuestCart(guestId);
      }
    }
  }, []);

  // Initialize new guest session
  const initGuestSession = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await guestAPI.initGuestSession();

      if (response.data.success) {
        const { guestId, expiresAt } = response.data;

        // Store in localStorage
        localStorage.setItem("guestId", guestId);
        localStorage.setItem("guestExpiresAt", expiresAt);

        dispatch({
          type: "INIT_GUEST_SESSION",
          payload: { guestId, expiresAt },
        });

        return { success: true, guestId };
      }
    } catch (error) {
      console.error("Failed to initialize guest session:", error);
      dispatch({ type: "SET_LOADING", payload: false });
      toast.error("Failed to start guest session");
      return { success: false };
    }
  };

  // Load guest cart
  const loadGuestCart = async (guestId) => {
    if (!guestId) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await guestAPI.getGuestCart(guestId);

      if (response.data.success) {
        dispatch({
          type: "SET_GUEST_CART",
          payload: response.data.cart,
        });
      }
    } catch (error) {
      console.error("Failed to load guest cart:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Add item to guest cart
  const addToGuestCart = async (productId, size, color, quantity = 1) => {
    let currentGuestId = state.guestId;

    // Initialize session if doesn't exist
    if (!currentGuestId) {
      const result = await initGuestSession();
      if (!result.success) {
        return { success: false, message: "Failed to start guest session" };
      }
      currentGuestId = result.guestId;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await guestAPI.addToGuestCart(currentGuestId, {
        productId,
        size,
        color,
        quantity,
      });

      if (response.data.success) {
        dispatch({
          type: "SET_GUEST_CART",
          payload: response.data.cart,
        });
        toast.success("Item added to cart!");
        return { success: true };
      }
    } catch (error) {
      console.error("Failed to add to guest cart:", error);
      dispatch({ type: "SET_LOADING", payload: false });
      const message =
        error.response?.data?.message || "Failed to add item to cart";
      toast.error(message);
      return { success: false, message };
    }
  };

  const updateGuestCartItem = async (productId, size, color, quantity) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await guestAPI.updateGuestCartItem(state.guestId, {
        productId,
        size,
        color,
        quantity,
      });

      if (response.data.success) {
        dispatch({
          type: "SET_GUEST_CART",
          payload: response.data.cart,
        });
        return { success: true };
      }
    } catch (error) {
      console.error("Failed to update guest cart:", error);
      toast.error("Failed to update item");
      dispatch({ type: "SET_LOADING", payload: false });
      return { success: false };
    }
  };

  const removeFromGuestCart = async (productId, size, color) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await guestAPI.removeFromGuestCart(state.guestId, {
        productId,
        size,
        color,
      });

      if (response.data.success) {
        dispatch({
          type: "SET_GUEST_CART",
          payload: response.data.cart,
        });
        toast.success("Item removed");
        return { success: true };
      }
    } catch (error) {
      console.error("Failed to remove from guest cart:", error);
      toast.error("Failed to remove item");
      dispatch({ type: "SET_LOADING", payload: false });
      return { success: false };
    }
  };

  //Clear guest cart function
  const clearGuestCart = () => {
    console.log("🧹 Clearing guest cart...");

    // Clear from state
    dispatch({ type: "CLEAR_GUEST_CART" });

    // Note: We keep the guestId and session alive
    // Only clearing cart items, not the session itself

    console.log("✅ Guest cart cleared");
  };

  // Clear guest session
  const clearGuestSession = () => {
    localStorage.removeItem("guestId");
    localStorage.removeItem("guestExpiresAt");
    dispatch({ type: "CLEAR_GUEST_SESSION" });
  };

  // Convert guest to registered user
  const convertGuestToRegistered = async (password) => {
    if (!state.guestId) {
      return { success: false, message: "No guest session found" };
    }

    try {
      const response = await guestAPI.convertGuestToRegistered(state.guestId, {
        password,
      });

      if (response.data.success) {
        // Clear guest session
        clearGuestSession();

        toast.success("Account created successfully!");
        return {
          success: true,
          token: response.data.token,
          user: response.data.user,
        };
      }
    } catch (error) {
      console.error("Failed to convert guest:", error);
      const message =
        error.response?.data?.message || "Failed to create account";
      toast.error(message);
      return { success: false, message };
    }
  };

  const expiry = localStorage.getItem("guestExpiresAt");

  if (expiry && new Date(expiry) < new Date()) {
    clearGuestSession();
  }

  const value = {
    ...state,
    initGuestSession,
    loadGuestCart,
    addToGuestCart,
    updateGuestCartItem,
    removeFromGuestCart,
    clearGuestCart,
    clearGuestSession,
    convertGuestToRegistered,
  };

  return (
    <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
  );
};

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
};
