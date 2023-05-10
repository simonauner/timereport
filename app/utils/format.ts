import { DailySumFormats } from "../constants";

export const formatDuration = (
  hours: number,
  minutes: number,
  format?: DailySumFormats
) => {
  if (format === DailySumFormats.decimal) {
    return `${(hours + minutes / 60).toFixed(2)} hours`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};
