import dayjs from "dayjs";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WorkBlock } from "./settings";

export type TimeReportPerDate = {
  date?: string;
  totalMinutes?: number;
  blocks: {
    startTime?: string;
    endTime?: string;
    name: WorkBlock["name"];
  }[];
};

type ITimeReportStore = {
  timeReportsPerDate: TimeReportPerDate[];
  setTimeReportPerDate: (data: {
    date: TimeReportPerDate["date"];
    name: TimeReportPerDate["blocks"][0]["name"];
    endTime?: TimeReportPerDate["blocks"][0]["endTime"];
    startTime?: TimeReportPerDate["blocks"][0]["startTime"];
  }) => void;
  handleWorkingBlockDeleted: (workingBlock: WorkBlock) => void;
};

const getTotalValidMinutesFromBlocks = (
  blocks: TimeReportPerDate["blocks"]
) => {
  const filledInBlocks = blocks.filter(
    (block) => block.startTime && block.endTime
  );

  const totalMinutes = filledInBlocks.reduce((acc, block) => {
    const blockMinutes = dayjs(block.endTime, "HH:mm").diff(
      dayjs(block.startTime, "HH:mm"),
      "minutes"
    );
    return acc + (isNaN(blockMinutes) ? 0 : blockMinutes);
  }, 0);

  return totalMinutes;
};

export const useTimeReportStore = create<ITimeReportStore>()(
  persist(
    (set) => ({
      timeReportsPerDate: [],
      handleWorkingBlockDeleted: (workingBlock) => {
        set((state) => {
          const updatedTimeReports = state.timeReportsPerDate.map((report) => {
            const blocks = report.blocks.filter(
              (blocks) => blocks.name !== workingBlock.name
            );

            return {
              ...report,
              blocks,
              totalMinutes: getTotalValidMinutesFromBlocks(blocks),
            };
          });
          return {
            timeReportsPerDate: updatedTimeReports,
          };
        });
      },
      setTimeReportPerDate: (reportUpdatePayload) =>
        set((state) => {
          const { date, ...updatedBlockPayload } = reportUpdatePayload;

          if (!date) return state;

          if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error("Invalid date format, expected YYYY-MM-DD");
          }
          const existingReport = state.timeReportsPerDate.find(
            (report) => report.date === date
          ) ?? { date: reportUpdatePayload.date, blocks: [] };

          const reports = state.timeReportsPerDate.filter(
            (report) => report.date !== date
          );

          const { blocks } = existingReport;

          const otherBlocks =
            blocks?.filter(
              (block) => block.name !== reportUpdatePayload.name
            ) || [];

          const existingBlock =
            blocks?.find((block) => block.name === reportUpdatePayload.name) ||
            {};

          const updatedBlock = {
            ...existingBlock,
            ...updatedBlockPayload,
          };

          const newBlocks = [...otherBlocks, updatedBlock];

          const totalMinutes = getTotalValidMinutesFromBlocks(newBlocks);

          return {
            timeReportsPerDate: [
              ...reports,
              {
                ...(existingReport ?? {}),
                blocks: newBlocks,
                totalMinutes: totalMinutes,
              },
            ],
          };
        }),
    }),
    {
      name: "timereports-store", // unique name
    }
  )
);
