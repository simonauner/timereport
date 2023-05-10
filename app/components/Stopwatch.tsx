"use client";
import dayjs from "dayjs";
import { TimeReportPerDate, useTimeReportStore } from "../store/timeReport";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";

export const Stopwatch = () => {
  const date = dayjs();
  const timeReport = useNextCompatibleStore(useTimeReportStore, (state) =>
    state.timeReportsPerDate.find(
      (t) => t.date === dayjs(date).format("YYYY-MM-DD")
    )
  );
  const store = useNextCompatibleStore(useTimeReportStore, (state) => state);
  const { setTimeReportPerDate } = store || {};

  const { startTime, endTime, lunchStartTime, lunchEndTime } = timeReport || {};

  const handleOnChange = (data: Partial<TimeReportPerDate>) => {
    setTimeReportPerDate?.({
      date: dayjs(date).format("YYYY-MM-DD"),
      ...data,
    });
  };

  return (
    <div>
      {!startTime && (
        <button
          onClick={() => handleOnChange({ startTime: dayjs().format("HH:mm") })}
        >
          Start workday
        </button>
      )}
      {startTime && !lunchStartTime && (
        <button
          onClick={() =>
            handleOnChange({ lunchStartTime: dayjs().format("HH:mm") })
          }
        >
          Go on lunch break
        </button>
      )}
      {startTime && lunchStartTime && !lunchEndTime && (
        <button
          onClick={() =>
            handleOnChange({ lunchEndTime: dayjs().format("HH:mm") })
          }
        >
          Resume work after lunch
        </button>
      )}
      {startTime && lunchStartTime && lunchEndTime && !endTime && (
        <button
          onClick={() => handleOnChange({ endTime: dayjs().format("HH:mm") })}
        >
          End workday
        </button>
      )}
    </div>
  );
};
