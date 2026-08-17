import React, { createContext, useContext, useState } from 'react';

const TextSizeContext = createContext({
  textSize: 'medium',
  setTextSize: () => {},
});

export function TextSizeProvider({ children, storageKey = 'hw_text_size' }) {
  const [textSize, setTextSizeState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'small' || saved === 'medium' || saved === 'large') return saved;
    } catch {}
    return 'medium';
  });

  const setTextSize = (size) => {
    setTextSizeState(size);
    try {
      localStorage.setItem(storageKey, size);
    } catch {}
  };

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  return useContext(TextSizeContext);
}

export const TEXT_SIZE_CLASS = {
  small: 'text-size-small',
  medium: 'text-size-medium',
  large: 'text-size-large',
};