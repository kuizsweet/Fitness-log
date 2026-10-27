"use client";
import { useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import styles from "./TrainingWorkbench.module.css";
export function CalendarMonthPicker({year,month,onChange}:{year:number;month:number;onChange:(year:number,month:number)=>void}) {
 const [open,setOpen]=useState(false);
 return <Menu.Root modal={false} open={open} onOpenChange={setOpen}><Menu.Trigger className={styles.monthPickerTrigger} aria-label="选择年月">{year} 年 {month} 月</Menu.Trigger>
  <Menu.Portal><Menu.Content className={styles.monthPickerMenu} sideOffset={8} align="center" collisionPadding={12}>
   <Menu.Label className={styles.monthPickerLabel}>年</Menu.Label>
   <Menu.Group className={styles.yearChoices}>
    {Array.from({length:11},(_,i)=>2020+i).map(value=><Menu.Item key={value} asChild onSelect={event=>event.preventDefault()}><button type="button" aria-pressed={year===value} onClick={()=>onChange(value,month)}>{value}</button></Menu.Item>)}
   </Menu.Group>
   <Menu.Separator className={styles.monthPickerSeparator}/>
   <Menu.Label className={styles.monthPickerLabel}>月</Menu.Label>
   <Menu.Group className={styles.monthChoices}>
    {Array.from({length:12},(_,i)=>i+1).map(value=><Menu.Item key={value} asChild><button type="button" aria-pressed={month===value} onClick={()=>{onChange(year,value);setOpen(false);}}>{value} 月</button></Menu.Item>)}
   </Menu.Group>
  </Menu.Content></Menu.Portal>
 </Menu.Root>;
}
