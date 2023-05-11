"use client";
import dayjs from "dayjs";
import { useTimeReportStore } from "../store/timeReport";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";
import { useSettingsStore } from "../store/settings";

export const Stopwatch = () => {
  const date = dayjs();
  const timeReport = useNextCompatibleStore(useTimeReportStore, (state) =>
    state.timeReportsPerDate.find(
      (t) => t.date === dayjs(date).format("YYYY-MM-DD")
    )
  );
  const workingBlocks = useNextCompatibleStore(
    useSettingsStore,
    (state) => state.workingBlocks
  );
  const store = useNextCompatibleStore(useTimeReportStore, (state) => state);
  const { setTimeReportPerDate } = store || {};

  const { blocks } = timeReport || {};

  // find first workingBlocks that has has no block time reported
  const workingBlock = workingBlocks?.find((workingBlock) => {
    const block = blocks?.find((block) => block.name === workingBlock.name);
    return !block || !block.startTime || !block.endTime;
  });
  const block = blocks?.find((block) => block.name === workingBlock?.name);
  let propertyName = !block?.startTime
    ? "startTime"
    : !block?.endTime
    ? "endTime"
    : "";

  const handleOnChange = () => {
    if (!workingBlock) return;
    setTimeReportPerDate?.({
      date: dayjs(date).format("YYYY-MM-DD"),
      name: workingBlock.name,
      [propertyName]: dayjs().format("HH:mm"),
    });
  };

  return (
    <div>
      {workingBlock && propertyName && (
        <button onClick={() => handleOnChange()}>
          {propertyName === "startTime" ? "Start" : "End"} {workingBlock.name}
        </button>
      )}
    </div>
  );
};
