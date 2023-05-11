import { create } from "zustand";
import { DailySumFormats } from "../constants";
import { persist } from "zustand/middleware";

export type WorkBlock = {
  name: string;
};

type ISettingsContext = {
  workingBlocks: WorkBlock[];
  isLunchEnabled: boolean;
  dailySumFormat: DailySumFormats;
  includeWeekends: boolean;
  setIsLunchEnabled: (isEnabled: boolean) => void;
  setDailySumFormat: (format: DailySumFormats) => void;
  setIncludeWeekends: (includeWeekends: boolean) => void;
  setWorkingBlocks: (workingBlocks: WorkBlock[]) => void;
};

export const useSettingsStore = create<ISettingsContext>()(
  persist(
    (set) => ({
      workingBlocks: [{ name: "Morning" }, { name: "Afternoon" }],
      isLunchEnabled: true,
      dailySumFormat: DailySumFormats.hours,
      includeWeekends: false,
      setIsLunchEnabled: (isEnabled) =>
        set((state) => ({ ...state, isLunchEnabled: isEnabled })),
      setDailySumFormat: (format) =>
        set((state) => ({ ...state, dailySumFormat: format })),
      setIncludeWeekends: (includeWeekends) =>
        set((state) => ({ ...state, includeWeekends })),
      setWorkingBlocks: (workingBlocks) =>
        set((state) => ({ ...state, workingBlocks })),
    }),
    {
      name: "settings-store", // unique name
    }
  )
);
