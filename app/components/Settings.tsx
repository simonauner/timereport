"use client";
import { DailySumFormats } from "../constants";
import { useSettingsStore } from "../store/settings";
import { useNextCompatibleStore } from "../store/useNextCompatibleStore";

export const Settings = () => {
  const store = useNextCompatibleStore(useSettingsStore, (state) => state);
  const {
    setDailySumFormat,
    setIncludeWeekends,
    deleteWorkingBlock,
    workingBlocks,
    dailySumFormat,
    includeWeekends,
    addWorkingBlock,
  } = store || {};
  return (
    <div>
      <div>
        Daily blocks
        <div style={{ display: "flex", gap: "1rem" }}>
          {workingBlocks?.map((workingBlock) => (
            <span
              style={{ borderWidth: "1px", borderStyle: "solid" }}
              key={workingBlock.name}
            >
              {workingBlock.name}
              <button
                type="button"
                onClick={() => deleteWorkingBlock?.(workingBlock)}
              >
                delete
              </button>
            </span>
          ))}
        </div>
        <div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.target as HTMLFormElement);
              console.log(Object.fromEntries(data.entries()));
              const blockName = data.get("blockName")?.toString();
              if (!blockName) return;

              addWorkingBlock?.({ name: blockName });
            }}
          >
            <input name="blockName" type="text" placeholder="New block name" />
            <button>Add</button>
          </form>
        </div>
      </div>
      <div>
        Include weekends
        <input
          type="radio"
          id="weekends-on"
          name="weekends"
          checked={includeWeekends}
          onChange={(event) => setIncludeWeekends?.(event.target.checked)}
        />
        <label htmlFor="weekends-on">Yes</label>
        <input
          type="radio"
          id="weekends-off"
          name="weekends"
          checked={!includeWeekends}
          onChange={(event) => setIncludeWeekends?.(!event.target.checked)}
        />
        <label htmlFor="weekends-off">No</label>
      </div>

      <div>
        <label htmlFor="dailySumFormat">Daily sum format</label>
        <select
          name="dailySumFormat"
          id="dailySumFormat"
          onChange={(event) => {
            setDailySumFormat?.(event.target.value as DailySumFormats);
          }}
          value={dailySumFormat}
        >
          <option value={DailySumFormats.hours}>Hours (HH:mm)</option>
          <option value={DailySumFormats.decimal}>Decimal (H.mm)</option>
        </select>
      </div>
    </div>
  );
};
