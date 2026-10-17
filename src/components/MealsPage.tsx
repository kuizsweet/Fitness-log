"use client";
import { useState } from "react";
import { Meals } from "./Meals";
import { useResource } from "./resource";
import { today, type Meal, type Profile } from "@/lib/domain";
import styles from "./MealsPage.module.css";

export function MealsPage({ initialDate }: { initialDate?: string }) {
  const profile = useResource<Profile>("profile");
  const [picked, setPicked] = useState(initialDate ?? "");
  const date = picked || today(profile.data?.timezone);
  const meals = useResource<Meal[]>(`meals?date=${date}`, true);
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1>三餐</h1>
        <input
          type="date"
          aria-label="三餐日期"
          value={date}
          min="2020-01-01"
          max="2030-12-31"
          onChange={(event) => {
            if (event.target.value) setPicked(event.target.value);
          }}
        />
        <button onClick={() => setPicked(today(profile.data?.timezone))}>
          今天
        </button>
      </header>
      <div className={styles.meals}>
        <Meals
          key={date}
          date={date}
          meals={meals.data ?? []}
          reload={meals.reload}
          loading={meals.loading}
          error={meals.error}
        />
      </div>
    </div>
  );
}
