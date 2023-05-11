import { useSettingsStore } from "../store/settings";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";
import { formatDuration } from "../utils/format";

type TotalHoursProps = {
  totalMinutes?: number;
  style?: React.CSSProperties;
};

export const TotalHours = ({ totalMinutes, ...props }: TotalHoursProps) => {
  const store = useNextCompatibleStore(useSettingsStore, (state) => state);
  const { dailySumFormat } = store || {};

  if (!totalMinutes) return null;

  return <span {...props}>{formatDuration(totalMinutes, dailySumFormat)}</span>;
};
