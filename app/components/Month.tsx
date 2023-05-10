"use client";
import { useCallback, useState } from "react";
import { Day } from "./Day";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { TotalHours } from "./TotalHours";
import { useSettingsStore } from "../store/settings";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";
import { useTimeReportStore } from "../store/timeReport";

dayjs.extend(isoWeek);

type MinutesPerDate = {
  [date: string]: number;
};

export const Month = () => {
  const settingsStore = useNextCompatibleStore(
    useSettingsStore,
    (state) => state
  );
  const { includeWeekends } = settingsStore || {};
  const timeReportsPerDate = useNextCompatibleStore(
    useTimeReportStore,
    (state) => state.timeReportsPerDate
  );

  const d = dayjs();
  const numberDays = d.daysInMonth();

  // loop array of days from numberDays
  const days = Array.from(Array(numberDays).keys());

  const totalMinutes = timeReportsPerDate?.reduce(
    (acc, timeReportPerDate) => acc + (timeReportPerDate?.totalMinutes ?? 0),
    0
  );

  const totalMinutesThisWeek = timeReportsPerDate
    ?.filter(
      (timeReportPerDate) =>
        dayjs(timeReportPerDate.date).isoWeek() === dayjs().isoWeek()
    )
    .map((timeReportPerDate) => timeReportPerDate.totalMinutes)
    .reduce((acc, minutes) => (acc ?? 0) + (minutes ?? 0), 0);

  return (
    <div>
      {dayjs(d).format("MMMM YYYY")}
      <ul>
        {days.map((day) => {
          const currentDate = d.date(day + 1);

          const isWeekend =
            currentDate.isoWeekday() === 6 || currentDate.isoWeekday() === 7;
          if (isWeekend && !includeWeekends) return null;

          return (
            <li key={day}>
              <Day date={currentDate.toString()} />
            </li>
          );
        })}
      </ul>
      <ul>
        <li>
          Total this week:{" "}
          <TotalHours totalMinutes={totalMinutesThisWeek ?? 0} />
        </li>
        <li>
          Total on month: <TotalHours totalMinutes={totalMinutes ?? 0} />
        </li>
      </ul>
    </div>
  );
};
