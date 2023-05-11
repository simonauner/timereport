import { create } from "zustand";
import { DailySumFormats } from "../constants";
import { persist } from "zustand/middleware";
import { useTimeReportStore } from "./timeReport";

export type WorkBlock = {
  name: string;
};

type ISettingsContext = {
  workingBlocks: WorkBlock[];
  dailySumFormat: DailySumFormats;
  includeWeekends: boolean;
  dailyHourTarget: string | null;
  dailyHourMax: string | null;
  ignoredDays: string[];
  setDailySumFormat: (format: DailySumFormats) => void;
  setIncludeWeekends: (includeWeekends: boolean) => void;
  setWorkingBlocks: (workingBlocks: WorkBlock[]) => void;
  addWorkingBlock: (workingBlock: WorkBlock) => void;
  deleteWorkingBlock: (workingBlock: WorkBlock) => void;
  setDailyHourTarget: (dailyHourTarget: string | null) => void;
  setDailyHourMax: (dailyHourMax: string | null) => void;
  addIgnoredDay: (day: string) => void;
  removeIgnoredDay: (day: string) => void;
};

export const useSettingsStore = create<ISettingsContext>()(
  persist(
    (set) => ({
      workingBlocks: [{ name: "Morning" }, { name: "Afternoon" }],
      isLunchEnabled: true,
      dailySumFormat: DailySumFormats.hours,
      includeWeekends: false,
      dailyHourTarget: null,
      dailyHourMax: null,
      ignoredDays: [],
      setDailySumFormat: (format) =>
        set((state) => ({ ...state, dailySumFormat: format })),
      setIncludeWeekends: (includeWeekends) =>
        set((state) => ({ ...state, includeWeekends })),
      setWorkingBlocks: (workingBlocks) =>
        set((state) => ({ ...state, workingBlocks })),
      deleteWorkingBlock: (workingBlock) => {
        set((state) => ({
          ...state,
          workingBlocks: state.workingBlocks.filter(
            (b) => b.name !== workingBlock.name
          ),
        }));
        useTimeReportStore.getState().handleWorkingBlockDeleted(workingBlock);
      },
      addWorkingBlock: (workingBlock) => {
        set((state) => {
          return {
            workingBlocks: [...state.workingBlocks, workingBlock],
          };
        });
      },
      setDailyHourTarget: (dailyHourTarget) =>
        set((state) => ({ dailyHourTarget })),
      setDailyHourMax: (dailyHourMax) => set((state) => ({ dailyHourMax })),
      addIgnoredDay: (day) =>
        set((state) => ({ ignoredDays: [...state.ignoredDays, day] })),
      removeIgnoredDay: (day) =>
        set((state) => ({
          ignoredDays: state.ignoredDays.filter((d) => d !== day),
        })),
    }),
    {
      name: "settings-store", // unique name
    }
  )
);
