import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const ToastContext = createContext(null);

// Static emitter to support toast.success() imports without hook injection
const listeners = new Set();

export const toast = (message, options = {}) => {
  const id = Math.random().toString(36).substring(2, 9);
  const toastObj = {
    id,
    message,
    type: options.type || "info",
    autoClose: options.autoClose !== undefined ? options.autoClose : 4000,
  };
  listeners.forEach((listener) => listener(toastObj));
  return id;
};

toast.success = (message, options = {}) => toast(message, { ...options, type: "success" });
toast.error = (message, options = {}) => toast(message, { ...options, type: "error" });
toast.warning = (message, options = {}) => toast(message, { ...options, type: "warning" });
toast.info = (message, options = {}) => toast(message, { ...options, type: "info" });
toast.dismiss = (id) => {
  listeners.forEach((listener) => listener({ id, dismiss: true }));
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return { toast };
  }
  return context;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toastObj) => {
    setToasts((prev) => {
      // Deduplicate identical active toasts to prevent toast spamming
      const isDuplicate = prev.some(
        (t) => t.message === toastObj.message && t.type === toastObj.type
      );
      if (isDuplicate) return prev;
      return [...prev, toastObj];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleNewToast = (toastObj) => {
      if (toastObj.dismiss) {
        removeToast(toastObj.id);
      } else {
        addToast(toastObj);
      }
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="custom-toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const duration = toast.autoClose;

  useEffect(() => {
    if (duration === false || duration === 0) return;

    const intervalTime = 16; // update approximately every frame (60fps)
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            handleDismiss();
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 250); // match transition out CSS duration
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-icon-svg success">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        );
      case "error":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-icon-svg error">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        );
      case "warning":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-icon-svg warning">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        );
      case "info":
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-icon-svg info">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        );
    }
  };

  return (
    <div
      className={`custom-toast custom-toast--${toast.type} ${isExiting ? "toast-exit" : "toast-enter"}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      <div className="custom-toast__content">
        <div className="custom-toast__icon-wrapper">{getIcon()}</div>
        <div className="custom-toast__body">{toast.message}</div>
        <button className="custom-toast__close-btn" onClick={handleDismiss} aria-label="Close toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      {duration > 0 && (
        <div className="custom-toast__progress-bar-container">
          <div
            className="custom-toast__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
