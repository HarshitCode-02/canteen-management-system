import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const load = () => {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (m) =>
    setItems((prev) => {
      const found = prev.find((i) => i.menuItemId === m._id);
      if (found) {
        return prev.map((i) =>
          i.menuItemId === m._id ? { ...i, qty: Math.min(i.qty + 1, 20) } : i
        );
      }
      return [...prev, { menuItemId: m._id, name: m.name, price: m.price, qty: 1 }];
    });

  const decrease = (id) =>
    setItems((prev) =>
      prev.flatMap((i) =>
        i.menuItemId === id ? (i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []) : [i]
      )
    );

  const remove = (id) => setItems((prev) => prev.filter((i) => i.menuItemId !== id));
  const clearCart = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, decrease, remove, clearCart, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);