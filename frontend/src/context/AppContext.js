import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

const STORAGE_KEY_CONFIG = 'grafanaprobe_config';
const STORAGE_KEY_USERNAME = 'grafanaprobe_username';
const TOAST_TIMEOUT = 4500;

let toastIdCounter = 0;

export function AppProvider({ children }) {
  // --- Config (persisted to localStorage) ---
  const [config, setConfigState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const setConfig = useCallback((updater) => {
    setConfigState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      } catch {
        // storage full or unavailable — silently ignore
      }
      return next;
    });
  }, []);

  // --- User name (persisted to localStorage) ---
  const [userName, setUserNameState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USERNAME) || '';
    } catch {
      return '';
    }
  });

  const setUserName = useCallback((name) => {
    setUserNameState(name);
    try {
      localStorage.setItem(STORAGE_KEY_USERNAME, name);
    } catch {
      // ignore
    }
  }, []);

  // --- Toasts ---
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    timersRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, TOAST_TIMEOUT + 300); // allow exit animation to complete

    return id;
  }, [removeToast]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const value = {
    config,
    setConfig,
    toasts,
    addToast,
    removeToast,
    userName,
    setUserName,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}

export default AppContext;
