"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { LoadingOverlay } from "../components/empty-state";

interface LoadingContextType {
  mostrarLoading: (val: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cargando, setCargando] = useState(false);

  const contextValue = useMemo(() => ({ mostrarLoading: setCargando }), []);

  return (
    <LoadingContext.Provider value={contextValue}>
      <LoadingOverlay cargando={cargando}>{children}</LoadingOverlay>
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error(
      "useLoadingContext debe usarse dentro de un LoadingProvider"
    );
  }
  return context;
};
