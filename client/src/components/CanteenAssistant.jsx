import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";

const EXAMPLES = [
  "Which canteen sells paneer sandwiches?",
  "Show popular items today",
  "What is my current order status?",
  "Suggest a meal under ₹100",
];

export default function CanteenAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    const conversation = messagesRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, loading]);

  const ask = async (event) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    setError("");
    setMessages((current) => [...current, { role: "user", text: question }]);
    setLoading(true);
    try {
      const result = await api.post("/smart/assistant", { message: question });
      setMessages((current) => [...current, {
        role: "assistant",
        text: result.data.reply,
        items: result.data.items || [],
        suggestions: result.data.suggestions || [],
        canteens: result.data.canteens || [],
      }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="smart-panel">
      <h2>Canteen assistant</h2>
      <p className="muted">Answers come from current menus and your own active order; no external AI service is used.</p>
      <section className="assistant-question-section" aria-labelledby="assistant-examples-title">
        <h3 id="assistant-examples-title">Your questions</h3>
        <div className="assistant-examples">
          {EXAMPLES.map((example) => (
            <button type="button" className="assistant-chip" key={example} onClick={() => {
              setInput(example);
              setError("");
            }}>
              {example}
            </button>
          ))}
        </div>
      </section>
      <div className="assistant-conversation">
        <div className="assistant-messages" aria-live="polite" aria-relevant="additions text" ref={messagesRef}>
          {messages.length === 0 && <p className="muted assistant-empty">Ask about food, availability, a budget, or your order.</p>}
          {messages.map((message, index) => (
            <article className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}>
              <b>{message.role === "user" ? "You" : "CampusBites"}</b>
              <p>{message.text}</p>
              {message.items?.length > 0 && (
                <ul>
                  {message.items.map((item) => (
                    <li key={item._id}>
                      {item.name} · ₹{item.price} · {item.canteen?.name || "Canteen"}
                      {item.isAvailable === false ? " · Sold out" : ""}
                    </li>
                  ))}
                </ul>
              )}
              {message.suggestions?.map((suggestion, suggestionIndex) => (
                <div className="assistant-suggestion" key={`${suggestion.canteen.id}-${suggestionIndex}`}>
                  <b>{suggestion.canteen.name} · ₹{suggestion.total}</b>
                  <span>{suggestion.items.map((item) => item.name).join(" + ")}</span>
                </div>
              ))}
              {message.canteens?.length > 0 && (
                <ul>
                  {message.canteens.map((canteen) => (
                    <li key={canteen._id}>{canteen.name} · {canteen.isOpen ? "Open" : "Closed"}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
          {loading && <p className="assistant-loading" role="status">Checking current data...</p>}
        </div>
      </div>
      <form className="assistant-form" onSubmit={ask}>
        <label className="assistant-field-label" htmlFor="assistant-question">Your question</label>
        <input
          id="assistant-question"
          type="text"
          maxLength={300}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            if (error) setError("");
          }}
          placeholder="Ask about the menu, prices, or your order..."
          aria-describedby="assistant-question-help"
        />
        <button type="submit" disabled={loading || !input.trim()}>{loading ? "Asking..." : "Ask"}</button>
        <span id="assistant-question-help" className="muted assistant-field-help">Up to 300 characters</span>
      </form>
      {error && <p className="error assistant-error" role="alert">{error}</p>}
    </section>
  );
}
