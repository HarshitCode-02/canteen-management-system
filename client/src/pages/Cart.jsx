import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { items, addItem, decrease, remove, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="card">
        <h2>Your cart is empty</h2>
        <Link to="/">Browse the menu</Link>
      </div>
    );
  }

  return (
    <div className="card wide">
      <h2>Your cart</h2>
      {items.map((i) => (
        <div key={i.menuItemId} className="cart-row">
          <div>
            <b>{i.name}</b>
            <p className="muted">₹{i.price} each</p>
          </div>
          <div className="stepper">
            <button className="small" onClick={() => decrease(i.menuItemId)}>−</button>
            <b>{i.qty}</b>
            <button className="small" onClick={() => addItem({ _id: i.menuItemId, ...i })}>+</button>
          </div>
          <b>₹{i.price * i.qty}</b>
          <button className="small danger" onClick={() => remove(i.menuItemId)}>✕</button>
        </div>
      ))}
      <div className="cart-total">
        <span>Total</span>
        <b>₹{total}</b>
      </div>
      <p className="muted">You pay at the counter when you collect.</p>
      <button disabled>Place order (coming Day 7)</button>
    </div>
  );
}