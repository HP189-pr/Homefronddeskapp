// src/navigation/NavigationContext.jsx
import React, { createContext, useContext } from 'react';
import { pushPage, replacePage } from './historyRouter';

const NavigationContext = createContext({
  navigate: (page, meta) => pushPage(page, meta),
  replace: (page, meta) => replacePage(page, meta),
});

export const NavigationProvider = ({ children, value }) => {
  return (
    <NavigationContext.Provider value={value ?? {
      navigate: (p, m) => pushPage(p, m),
      replace: (p, m) => replacePage(p, m),
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNav = () => useContext(NavigationContext);
