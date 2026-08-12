"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type DataSaverState = {
  dataSaverEnabled: boolean;
  setDataSaverEnabled: (enabled: boolean) => void;
};

// Persisted locally (not per-account) — it's a device/connection preference,
// not user profile data, so it should stick even across account switches.
export const useDataSaverStore = create<DataSaverState>()(
  persist(
    set => ({
      dataSaverEnabled: false,
      setDataSaverEnabled: enabled => set({ dataSaverEnabled: enabled }),
    }),
    { name: "data-saver-preference" }
  )
);
