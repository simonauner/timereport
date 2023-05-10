"use client";
import { DailySumFormats } from "../constants";
import { useSettingsStore } from "../store/settings";

export const Controls = () => {
  const {
    setIsLunchEnabled,
    setDailySumFormat,
    setIncludeWeekends,
    dailySumFormat,
    includeWeekends,
    isLunchEnabled,
  } = useSettingsStore();

  return (
    <div>
      <form>
        <div>
          Include lunch breaks
          <input
            type="radio"
            id="lunch-on"
            name="lunch"
            value="on"
            checked={isLunchEnabled}
            onChange={(event) => setIsLunchEnabled(event.target.checked)}
          />
          <label htmlFor="lunch-on">Yes</label>
          <input
            type="radio"
            id="lunch-off"
            name="lunch"
            value="off"
            checked={!isLunchEnabled}
            onChange={(event) => setIsLunchEnabled(!event.target.checked)}
          />
          <label htmlFor="lunch-off">No</label>
        </div>

        <div>
          Include weekends
          <input
            type="radio"
            id="weekends-on"
            name="weekends"
            checked={includeWeekends}
            onChange={(event) => setIncludeWeekends(event.target.checked)}
          />
          <label htmlFor="weekends-on">Yes</label>
          <input
            type="radio"
            id="weekends-off"
            name="weekends"
            checked={!includeWeekends}
            onChange={(event) => setIncludeWeekends(!event.target.checked)}
          />
          <label htmlFor="weekends-off">No</label>
        </div>

        <div>
          <label htmlFor="dailySumFormat">Daily sum format</label>
          <select
            name="dailySumFormat"
            id="dailySumFormat"
            onChange={(event) => {
              setDailySumFormat(event.target.value as DailySumFormats);
            }}
            value={dailySumFormat}
          >
            <option value={DailySumFormats.hours}>Hours (HH:mm)</option>
            <option value={DailySumFormats.decimal}>Decimal (H.mm)</option>
          </select>
        </div>
      </form>
    </div>
  );
};
