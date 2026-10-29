import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const loadCanteen = () => {
  try {
    return JSON.parse(localStorage.getItem("cartCanteen")) || null;
  } catch {
    return null;
  }
};

// An old cart saved before this update has no canteen, so it is dropped once.
const loadItems = () => {
  try {
    if (!localStorage.getItem("cartCanteen")) return [];
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadItems);
  const [canteen, setCanteen] = useState(loadCanteen); // { _id, name } or null

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (canteen) localStorage.setItem("cartCanteen", JSON.stringify(canteen));
    else localStorage.removeItem("cartCanteen");
  }, [canteen]);

  // an empty cart belongs to no canteen
  useEffect(() => {
    if (items.length === 0 && canteen) setCanteen(null);
  }, [items, canteen]);

  // addItem(menuItem, canteen): pass the canteen when adding from a menu page.
  // The menu page stops mixed carts before calling this.
  const addItem = (m, c) => {
    if (c) setCanteen({ _id: c._id, name: c.name });
    setItems((prev) => {
      const found = prev.find((i) => i.menuItemId === m._id);
      if (found) {
        return prev.map((i) =>
          i.menuItemId === m._id ? { ...i, qty: Math.min(i.qty + 1, 20) } : i
        );
      }
      return [...prev, { menuItemId: m._id, name: m.name, price: m.price, qty: 1 }];
    });
  };

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
    <CartContext.Provider
      value={{ items, canteen, addItem, decrease, remove, clearCart, count, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);