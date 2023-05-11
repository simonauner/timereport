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
  const { includeWeekends, dailyHourTarget, dailyHourMax } =
    settingsStore || {};
  const dailyHourTargetAsMinutes =
    dayjs(dailyHourTarget, "HH:mm").hour() * 60 +
    dayjs(dailyHourTarget, "HH:mm").minute();
  const dailyHourMaxAsMinutes =
    dayjs(dailyHourMax, "HH:mm").hour() * 60 +
    dayjs(dailyHourMax, "HH:mm").minute();
  console.log(dailyHourTargetAsMinutes);
  const timeReportsPerDate = useNextCompatibleStore(
    useTimeReportStore,
    (state) => state.timeReportsPerDate
  );

  const d = dayjs();
  const numberDaysInMonth = d.daysInMonth();

  // loop array of days from numberDays
  const days = Array.from(Array(numberDaysInMonth).keys());

  const workingDaysInMonth = includeWeekends
    ? days.length
    : days.filter((day) => {
        const currentDate = d.date(day + 1);

        const isWeekend =
          currentDate.isoWeekday() === 6 || currentDate.isoWeekday() === 7;
        return !isWeekend;
      }).length;

  const reportedMinutesOrTarget = days
    .map((day) => {
      const currentDate = d.date(day + 1);

      const isWeekend =
        currentDate.isoWeekday() === 6 || currentDate.isoWeekday() === 7;
      if (isWeekend && !includeWeekends) return 0;

      const timeReportForDate = timeReportsPerDate?.find(
        (timeReportPerDate) =>
          timeReportPerDate.date === currentDate.format("YYYY-MM-DD")
      );

      return timeReportForDate?.totalMinutes ?? dailyHourTargetAsMinutes;
    })
    .reduce((acc, minutes) => acc + minutes, 0);

  const totalReportedMinutes = timeReportsPerDate?.reduce(
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

  const accumulatedDiffAsMinutes =
    (totalReportedMinutes ?? 0) -
    (timeReportsPerDate?.length ?? 0) * dailyHourTargetAsMinutes;
  const maxMinutesPerMonth = workingDaysInMonth * dailyHourMaxAsMinutes;

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
          Total on month:{" "}
          <TotalHours totalMinutes={totalReportedMinutes ?? 0} />
        </li>

        <li>
          Target:{" "}
          <TotalHours
            totalMinutes={workingDaysInMonth * dailyHourTargetAsMinutes}
          />
        </li>
        <li>
          Reported and using target for unreported:{" "}
          <TotalHours
            style={{
              backgroundColor:
                workingDaysInMonth * dailyHourTargetAsMinutes >
                workingDaysInMonth * dailyHourMaxAsMinutes
                  ? "pink"
                  : undefined,
            }}
            totalMinutes={reportedMinutesOrTarget}
          />
          {totalReportedMinutes &&
            timeReportsPerDate?.length &&
            dailyHourTarget && (
              <>
                {" ("}
                <TotalHours
                  style={{
                    backgroundColor:
                      accumulatedDiffAsMinutes > maxMinutesPerMonth
                        ? "red"
                        : accumulatedDiffAsMinutes > 0
                        ? "lightgreen"
                        : undefined,
                  }}
                  totalMinutes={accumulatedDiffAsMinutes}
                />
                {")"}
              </>
            )}
        </li>
        <li>
          Max: <TotalHours totalMinutes={maxMinutesPerMonth} />
        </li>
      </ul>
    </div>
  );
};
