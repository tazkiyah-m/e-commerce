'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: number;
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image_url: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id' | 'quantity' | 'stock'>) => void;
  removeFromCart: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, delta: number) => void;
  cartCount: number;
  subtotal: number;
  total: number;
  promoCode: string | null;
  promoDiscount: number;
  applyPromo: (code: string) => Promise<{isValid: boolean; message: string}>;
  clearCart: () => void;
  fetchCart: () => Promise<void>;
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const API_URL = 'http://localhost:8080/api';
const USER_ID = 1; // Hardcoded for demo

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<string | null>(null);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddressState] = useState<string>('');

  useEffect(() => {
    // Load delivery address from localStorage on mount
    const savedAddress = localStorage.getItem('deliveryAddress');
    if (savedAddress) {
      setDeliveryAddressState(savedAddress);
    }
  }, []);

  const setDeliveryAddress = (address: string) => {
    setDeliveryAddressState(address);
    localStorage.setItem('deliveryAddress', address);
  };

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_URL}/cart?user_id=${USER_ID}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch cart", e);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addToCart = async (newItem: Omit<CartItem, 'id' | 'quantity' | 'stock'>) => {
    try {
      await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          menu_item_id: newItem.menu_item_id,
          quantity: 1
        })
      });
      fetchCart();
    } catch (e) {
      console.error("Failed to add to cart", e);
    }
  };

  const removeFromCart = async (menuItemId: number) => {
    try {
      await fetch(`${API_URL}/cart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          menu_item_id: menuItemId,
          quantity: 0
        })
      });
      fetchCart();
    } catch (e) {
      console.error("Failed to remove from cart", e);
    }
  };

  const updateQuantity = async (menuItemId: number, delta: number) => {
    const existing = items.find(i => i.menu_item_id === menuItemId);
    if (!existing) return;
    
    // Clamp between 1 and available stock (fallback to 999 if undefined)
    const stockLimit = existing.stock !== undefined ? existing.stock : 999;
    const newQty = Math.max(1, Math.min(stockLimit, existing.quantity + delta));
    
    if (newQty === existing.quantity || isNaN(newQty)) return; // No change needed
    
    try {
      await fetch(`${API_URL}/cart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          menu_item_id: menuItemId,
          quantity: newQty
        })
      });
      fetchCart();
    } catch (e) {
      console.error("Failed to update cart", e);
    }
  };

  const applyPromo = async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/promos/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode: code })
      });
      const data = await res.json();
      if (data.isValid) {
        setPromoCode(code);
        setDiscountType(data.discountType);
        setDiscountValue(data.discountValue);
        return { isValid: true, message: data.message };
      }
      return { isValid: false, message: data.message };
    } catch (e) {
      return { isValid: false, message: "Terjadi kesalahan pada server." };
    }
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode(null);
    setPromoDiscount(0);
    setDiscountType(null);
    setDiscountValue(0);
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculate Promo Discount
  let calcDiscount = 0;
  if (discountType === 'percentage') {
    calcDiscount = subtotal * (discountValue / 100);
  } else if (discountType === 'fixed') {
    calcDiscount = discountValue;
  }
  
  // Ensure discount doesn't exceed subtotal
  if (calcDiscount > subtotal) {
    calcDiscount = subtotal;
  }
  
  const total = subtotal - calcDiscount;

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, cartCount, subtotal, total, promoCode, promoDiscount: calcDiscount, applyPromo, clearCart, fetchCart, deliveryAddress, setDeliveryAddress }}>
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
