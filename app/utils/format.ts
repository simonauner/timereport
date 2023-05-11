import { DailySumFormats } from "../constants";

export const formatDuration = (minutes: number, format?: DailySumFormats) => {
  const remainingMinutes = minutes % 60;
  const hours = (minutes - remainingMinutes) / 60;

  if (format === DailySumFormats.decimal) {
    return `${(hours + remainingMinutes / 60).toFixed(2)} hours`;
  }

  return `${hours.toString().padStart(2, "0")}:${Math.abs(remainingMinutes)
    .toString()
    .padStart(2, "0")}`;
};
