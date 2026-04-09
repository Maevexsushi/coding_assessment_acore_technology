import '@/styles/globals.css';
import { useMemo } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { ColorModeProvider, useColorMode } from '@/lib/colorModeContext';
import { createAppTheme } from '@/lib/theme';

function ThemedApp({ Component, pageProps }) {
  const { mode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ColorModeProvider>
      <ThemedApp Component={Component} pageProps={pageProps} />
    </ColorModeProvider>
  );
}
