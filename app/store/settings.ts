import { create } from "zustand";
import { DailySumFormats } from "../constants";
import { persist } from "zustand/middleware";

type ISettingsContext = {
  isLunchEnabled: boolean;
  dailySumFormat: DailySumFormats;
  includeWeekends: boolean;
  setIsLunchEnabled: (isEnabled: boolean) => void;
  setDailySumFormat: (format: DailySumFormats) => void;
  setIncludeWeekends: (includeWeekends: boolean) => void;
};

export const useSettingsStore = create<ISettingsContext>()(
  persist(
    (set) => ({
      isLunchEnabled: true,
      dailySumFormat: DailySumFormats.hours,
      includeWeekends: false,
      setIsLunchEnabled: (isEnabled) =>
        set((state) => ({ ...state, isLunchEnabled: isEnabled })),
      setDailySumFormat: (format) =>
        set((state) => ({ ...state, dailySumFormat: format })),
      setIncludeWeekends: (includeWeekends) =>
        set((state) => ({ ...state, includeWeekends })),
      // removeAllBears: () => set({ bears: 0 }),
    }),
    {
      name: "settings-store", // unique name
    }
  )
);
