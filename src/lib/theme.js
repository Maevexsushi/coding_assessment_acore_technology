import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary:    { main: '#2E7D32', light: '#4CAF50', dark: '#1B5E20' },
      secondary:  { main: '#8BC34A' },
      warning:    { main: '#F9A825' },
      error:      { main: '#D32F2F' },
      success:    { main: '#388E3C' },
      background: {
        default: mode === 'dark' ? '#121712' : '#F1F8E9',
        paper:   mode === 'dark' ? '#1E261E' : '#FFFFFF',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
  });
}
