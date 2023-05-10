"use client";
import React, { useCallback } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { TotalHours } from "./TotalHours";
import { useSettingsStore } from "../store/settings";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";
import { TimeReportPerDate, useTimeReportStore } from "../store/timeReport";
dayjs.extend(customParseFormat);

type DayProps = {
  date: string;
};

export const Day = ({ date }: DayProps) => {
  const timeReport = useNextCompatibleStore(useTimeReportStore, (state) =>
    state.timeReportsPerDate.find(
      (t) => t.date === dayjs(date).format("YYYY-MM-DD")
    )
  );

  const { startTime, endTime, lunchStartTime, lunchEndTime } = timeReport || {};

  const store = useNextCompatibleStore(useTimeReportStore, (state) => state);
  const { setTimeReportPerDate } = store || {};

  const { isLunchEnabled } = useSettingsStore();

  const totalLunchMinutes = dayjs(lunchEndTime, "HH:mm").diff(
    dayjs(lunchStartTime, "HH:mm"),
    "minutes"
  );

  const isLunchValid = !isNaN(totalLunchMinutes) && isLunchEnabled;

  const totalMinutes =
    dayjs(endTime, "HH:mm").diff(dayjs(startTime, "HH:mm"), "minutes") -
    (isLunchValid ? totalLunchMinutes : 0);

  const isValid = !isNaN(totalMinutes);

  const isCurrentWeek = dayjs(date).isoWeek() === dayjs().isoWeek();
  const isToday = dayjs(date).date() === dayjs().date();

  const handleOnChange = (data: Partial<TimeReportPerDate>) => {
    setTimeReportPerDate?.({
      date: dayjs(date).format("YYYY-MM-DD"),
      ...data,
    });
  };

  return (
    <div>
      <div
        style={{
          display: "inline-block",
          width: "200px",
          backgroundColor: isToday
            ? "green"
            : isCurrentWeek
            ? "darkgreen"
            : undefined,
        }}
      >
        {dayjs(date).format("YYYY-MM-DD")} {dayjs(date).format("dddd")}
        {isToday ? "*" : ""}
      </div>
      <input
        type="text"
        name="startTime"
        placeholder="start time"
        size={15}
        value={startTime}
        onChange={(event) => handleOnChange({ startTime: event.target.value })}
      ></input>
      {isLunchEnabled && (
        <>
          <input
            type="text"
            placeholder="lunch start time"
            size={15}
            value={lunchStartTime}
            onChange={(event) =>
              handleOnChange({ lunchStartTime: event.target.value })
            }
          ></input>
          <input
            type="text"
            placeholder="lunch end time"
            size={15}
            value={lunchEndTime}
            onChange={(event) =>
              handleOnChange({ lunchEndTime: event.target.value })
            }
          ></input>
        </>
      )}
      <input
        type="text"
        placeholder="end time"
        size={15}
        value={endTime}
        onChange={(event) => handleOnChange({ endTime: event.target.value })}
      ></input>
      {isValid ? (
        <>
          Total: <TotalHours totalMinutes={totalMinutes} />
        </>
      ) : null}
    </div>
  );
};
