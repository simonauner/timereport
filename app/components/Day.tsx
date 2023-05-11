"use client";
import React, { useCallback } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { TotalHours } from "./TotalHours";
import { useSettingsStore } from "../store/settings";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";
import { useTimeReportStore } from "../store/timeReport";
import { DiffToTarget } from "./DiffToTarget";
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
  const workingBlocks = useNextCompatibleStore(
    useSettingsStore,
    (state) => state.workingBlocks
  );

  // const { startTime, endTime, lunchStartTime, lunchEndTime } = timeReport || {};

  const store = useNextCompatibleStore(useTimeReportStore, (state) => state);
  const { setTimeReportPerDate } = store || {};

  const isCurrentWeek = dayjs(date).isoWeek() === dayjs().isoWeek();
  const isToday = dayjs(date).date() === dayjs().date();

  const handleOnChange = (data: {
    name: string;
    endTime?: string;
    startTime?: string;
  }) => {
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
      {workingBlocks?.map((workingBlock) => {
        const block = timeReport?.blocks.find(
          (b) => b.name === workingBlock.name
        );

        return (
          <span key={workingBlock.name}>
            <input
              type="text"
              name={`${workingBlock.name}-start`}
              placeholder={`start ${workingBlock.name}`}
              size={15}
              value={block?.startTime}
              onChange={(event) =>
                handleOnChange({
                  name: workingBlock.name,
                  startTime: event.target.value,
                })
              }
            ></input>
            <input
              type="text"
              name={`${workingBlock.name}-end`}
              placeholder={`end ${workingBlock.name}`}
              size={15}
              value={block?.endTime}
              onChange={(event) =>
                handleOnChange({
                  name: workingBlock.name,
                  endTime: event.target.value,
                })
              }
            ></input>
          </span>
        );
      })}
      {timeReport?.totalMinutes ? (
        <>
          Total: <TotalHours totalMinutes={timeReport?.totalMinutes} />
        </>
      ) : null}
      {timeReport?.totalMinutes ? (
        <DiffToTarget totalMinutes={timeReport?.totalMinutes} />
      ) : null}
    </div>
  );
};
