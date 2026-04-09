import { createContext, useContext, useState, useEffect } from 'react';

const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} });

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gsColorMode');
      if (saved === 'dark' || saved === 'light') setMode(saved);
    } catch {}
  }, []);

  function toggleColorMode() {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('gsColorMode', next); } catch {}
      return next;
    });
  }

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  return useContext(ColorModeContext);
}
