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
  setDailySumFormat: (format: DailySumFormats) => void;
  setIncludeWeekends: (includeWeekends: boolean) => void;
  setWorkingBlocks: (workingBlocks: WorkBlock[]) => void;
  addWorkingBlock: (workingBlock: WorkBlock) => void;
  deleteWorkingBlock: (workingBlock: WorkBlock) => void;
};

export const useSettingsStore = create<ISettingsContext>()(
  persist(
    (set) => ({
      workingBlocks: [{ name: "Morning" }, { name: "Afternoon" }],
      isLunchEnabled: true,
      dailySumFormat: DailySumFormats.hours,
      includeWeekends: false,
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
            ...state,
            workingBlocks: [...state.workingBlocks, workingBlock],
          };
        });
      },
    }),
    {
      name: "settings-store", // unique name
    }
  )
);
