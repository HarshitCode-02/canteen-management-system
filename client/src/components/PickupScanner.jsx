import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";

export default function PickupScanner({ onCollected }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const processingRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stopScanning = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  const verify = async (token, controls) => {
    if (processingRef.current) return;
    processingRef.current = true;
    controls?.stop();
    controlsRef.current = null;
    setScanning(false);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.post("/orders/verify-qr", { token });
      setMessage(`Order #${result.data.orderNumber} collected. Payment remains separate.`);
      await onCollected();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      processingRef.current = false;
      setBusy(false);
    }
  };

  const startScanning = async () => {
    setError("");
    setMessage("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning requires HTTPS. Use the four-digit pickup code instead.");
      return;
    }

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result, _decodeError, scanControls) => {
          if (result) void verify(result.getText(), scanControls);
        }
      );
      controlsRef.current = controls;
      setScanning(true);
    } catch {
      setError("Camera is unavailable or permission was denied. Allow camera access or use the four-digit code.");
    }
  };

  return (
    <section className="pickup-scanner" aria-labelledby="pickup-scanner-title">
      <h3 id="pickup-scanner-title">QR pickup</h3>
      <p className="muted">Allow camera access only after choosing Start scanner. Four-digit code remains available below.</p>
      {!scanning ? (
        <button type="button" onClick={startScanning} disabled={busy}>
          {busy ? "Verifying..." : "Start QR scanner"}
        </button>
      ) : (
        <>
          <video ref={videoRef} className="pickup-scanner-video" muted playsInline />
          <button type="button" className="small" onClick={stopScanning}>Stop scanner</button>
        </>
      )}
      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
