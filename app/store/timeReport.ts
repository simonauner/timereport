import dayjs from "dayjs";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimeReportPerDate = {
  date?: string;
  startTime?: string;
  endTime?: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
  totalMinutes?: number;
};

type ITimeReportStore = {
  timeReportsPerDate: TimeReportPerDate[];
  setTimeReportPerDate: (timeReportPerDate: TimeReportPerDate) => void;
};

export const useTimeReportStore = create<ITimeReportStore>()(
  persist(
    (set) => ({
      timeReportsPerDate: [],
      setTimeReportPerDate: (timeReport) =>
        set((state) => {
          if (!timeReport?.date) return state;

          if (!timeReport.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error("Invalid date format, expected YYYY-MM-DD");
          }
          const existingReport = state.timeReportsPerDate.find(
            (report) => report.date === timeReport.date
          );
          const reports = state.timeReportsPerDate.filter(
            (report) => report.date !== timeReport.date
          );

          const { startTime, endTime, lunchStartTime, lunchEndTime } = {
            ...existingReport,
            ...timeReport,
          };

          const totalLunchMinutes = dayjs(lunchEndTime, "HH:mm").diff(
            dayjs(lunchStartTime, "HH:mm"),
            "minutes"
          );

          const isLunchValid = !isNaN(totalLunchMinutes);

          const totalMinutes =
            dayjs(endTime, "HH:mm").diff(dayjs(startTime, "HH:mm"), "minutes") -
            (isLunchValid ? totalLunchMinutes : 0);

          const isTotalMinutesValid = !isNaN(totalMinutes);

          return {
            timeReportsPerDate: [
              ...reports,
              {
                ...existingReport,
                ...timeReport,
                totalMinutes: isTotalMinutesValid ? totalMinutes : 0,
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
