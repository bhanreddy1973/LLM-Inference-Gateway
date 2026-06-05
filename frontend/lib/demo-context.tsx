"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { isDemoMode } from "./demo";

interface DemoContextValue {
  isDemo: boolean;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false });

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setIsDemo(isDemoMode());
  }, []);

  return (
    <DemoContext.Provider value={{ isDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): boolean {
  return useContext(DemoContext).isDemo;
}
