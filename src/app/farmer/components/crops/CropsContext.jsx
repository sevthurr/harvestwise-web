import { createContext, useContext, useState } from "react";
import { MOCK_CROPS } from "./types";
const CropsContext = createContext(null);
const CropsProvider = ({ children }) => {
  const [crops, setCrops] = useState(MOCK_CROPS);
  const addCrop = (crop) => setCrops((c) => [crop, ...c]);
  const updateCrop = (id, patch) => setCrops((c) => c.map((r) => r.id === id ? { ...r, ...patch } : r));
  return <CropsContext.Provider value={{ crops, addCrop, updateCrop }}>
      {children}
    </CropsContext.Provider>;
};
const useCrops = () => {
  const ctx = useContext(CropsContext);
  if (!ctx) throw new Error("useCrops must be used inside CropsProvider");
  return ctx;
};
export {
  CropsProvider,
  useCrops
};
