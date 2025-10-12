// src/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './AppRouter';
import './styles/global.css';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AppRouter />
  </ThemeProvider>,
);
