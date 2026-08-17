import React, { createContext, useContext, useState } from 'react';
const DisplayModeContext = createContext({
  mode: 'simplified',
  setMode: () => {},
});

export const DisplayModeProvider = ({ children }) => {
  const [mode, setMode] = useState('simplified');
  return (
    <DisplayModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DisplayModeContext.Provider>
  );
};

export const useDisplayMode = () => useContext(DisplayModeContext);
