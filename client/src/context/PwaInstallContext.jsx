import { useCallback, useEffect, useRef, useState } from "react";
import PwaInstallContext from "./PwaInstallContext";

function isStandalone() {
  const displayMode = typeof window.matchMedia === "function"
    && window.matchMedia("(display-mode: standalone)").matches;
  return displayMode || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

export function PwaInstallProvider({ children }) {
  const deferredPrompt = useRef(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [isIos] = useState(isIosDevice);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPrompt.current = event;
      setCanInstall(true);
    };
    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return false;
    deferredPrompt.current = null;
    setCanInstall(false);
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      return choice.outcome === "accepted";
    } finally {
      setInstalling(false);
    }
  }, []);

  return (
    <PwaInstallContext.Provider value={{ canInstall, installed, isIos, installing, install }}>
      {children}
    </PwaInstallContext.Provider>
  );
}
