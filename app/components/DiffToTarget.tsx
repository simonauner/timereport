import dayjs from "dayjs";
import { useSettingsStore } from "../store/settings";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";
import { formatDuration } from "../utils/format";

type Props = {
  totalMinutes?: number;
};

export const DiffToTarget = ({ totalMinutes }: Props) => {
  const store = useNextCompatibleStore(useSettingsStore, (state) => state);
  const { dailyHourTarget, dailySumFormat } = store || {};

  if (!totalMinutes) return null;

  const remainingMinutes = totalMinutes % 60;
  const totalHours = (totalMinutes - remainingMinutes) / 60;
  const diff = dayjs(`${totalHours}:${remainingMinutes}`, "HH:mm").diff(
    dayjs(dailyHourTarget, "HH:mm"),
    "minutes"
  );

  if (!diff) return null;

  const isBehindDailyTarget = diff < 0;
  const isAheadDailyTarget = diff > 0;

  return (
    <>
      (
      <span
        style={{
          backgroundColor: isBehindDailyTarget
            ? "pink"
            : isAheadDailyTarget
            ? "lightgreen"
            : undefined,
        }}
      >
        {formatDuration(diff, dailySumFormat)}
      </span>
      )
    </>
  );
};
