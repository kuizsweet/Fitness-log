"use client";
import { useId, useState } from "react";
import type { Meal } from "@/lib/domain";
import { Meals } from "./Meals";
import { Feedback } from "./Feedback";
const tabs = [
  ["breakfast", "早餐"],
  ["lunch", "午餐"],
  ["dinner", "晚餐"],
] as const;
export function MealsCard({
  date,
  meals,
  ready,
  loading,
  error,
  reload,
}: {
  date: string;
  meals: Meal[];
  ready: boolean;
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  const [selected, setSelected] = useState<Meal["meal_type"]>("breakfast");
  const id = useId();
  return (
    <section className="module module-meals daily-meals" aria-label="三餐记录">
      <div className="module-heading">
        <h2>三餐记录</h2>
      </div>
      <div className="meal-tabs" role="tablist" aria-label="选择餐次">
        {tabs.map(([type, label], index) => (
          <button
            key={type}
            role="tab"
            id={`${id}-${type}`}
            aria-selected={selected === type}
            aria-controls={`${id}-panel-${type}`}
            tabIndex={selected === type ? 0 : -1}
            onClick={() => setSelected(type)}
            onKeyDown={(event) => {
              let target = index;
              if (event.key === "ArrowRight") target = (index + 1) % 3;
              else if (event.key === "ArrowLeft") target = (index + 2) % 3;
              else if (event.key === "Home") target = 0;
              else if (event.key === "End") target = 2;
              else return;
              event.preventDefault();
              setSelected(tabs[target][0]);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("button")
                [target].focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Feedback error={error} loading={!ready && loading} />
      {ready &&
        tabs.map(([type]) => (
          <div
            key={type}
            id={`${id}-panel-${type}`}
            role="tabpanel"
            aria-labelledby={`${id}-${type}`}
            hidden={selected !== type}
          >
            <Meals
              date={date}
              meals={meals}
              reload={reload}
              only={type}
              embedded
            />
          </div>
        ))}
    </section>
  );
}
