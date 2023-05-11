import { useSettingsStore } from "../store/settings";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";
import { formatDuration } from "../utils/format";

type TotalHoursProps = {
  totalMinutes?: number;
};

export const TotalHours = ({ totalMinutes }: TotalHoursProps) => {
  const store = useNextCompatibleStore(useSettingsStore, (state) => state);
  const { dailySumFormat } = store || {};

  if (!totalMinutes) return null;

  const remainingMinutes = totalMinutes % 60;
  const totalHours = (totalMinutes - remainingMinutes) / 60;
  return <>{formatDuration(totalHours, remainingMinutes, dailySumFormat)}</>;
};
