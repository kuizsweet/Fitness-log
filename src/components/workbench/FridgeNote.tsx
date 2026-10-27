"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { paperVariant, warehousePaperSize, type PlanNote } from "@/lib/training-workbench";
import { NOTE_PALETTE_CSS } from "@/lib/note-colors";
import styles from "./TrainingWorkbench.module.css";
const edges = [
 "M1 1H99V94L96 97V99H4L1 96Z",
 "M1 1H99V97L97 99H7V96H1Z",
 "M1 1H99V92L95 95V99H1Z",
 "M1 1H99V98H8L6 95H1Z",
];
export function PaperSurface({ note }: { note: Pick<PlanNote, "id" | "paperVariant"> }) {
 return <svg className={styles.paperSurface} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><path d={edges[paperVariant(note)]} vectorEffect="non-scaling-stroke" /></svg>;
}
function WarehouseFace({note}:{note:PlanNote}) {
 return <span><strong>{note.title||"未命名计划"}</strong><small>{note.exercises.length} 个动作</small></span>;
}
export function FoldedNotePreview({note}:{note:PlanNote}) {
 return <div className={`${styles.workbench} ${styles.compactNotePreview}`} style={NOTE_PALETTE_CSS as CSSProperties} aria-hidden>
  <div className={styles.fridgeWarehouse} style={{width:"100%",height:"100%"}}>
   <div className={styles.storedNote} data-paper-shape data-note-color={note.color??"gray"} data-folded-shape={note.foldedShape} style={{width:"100%",height:"100%"}}>
    <PaperSurface note={note}/><div className={styles.warehouseHandle}><WarehouseFace note={note}/></div>
   </div>
  </div>
 </div>;
}
export function WarehouseNote({note,group,selected,layer,previewPosition,magnetHeld,onSelect}: {
 note:PlanNote;group:string;selected:boolean;layer:number;previewPosition?:{x:number;y:number};magnetHeld:boolean;onSelect:()=>void;
}) {
 const slot=useRef<HTMLDivElement>(null);
 const [host,setHost]=useState<HTMLElement|null>(null);
 const [bounds,setBounds]=useState({width:280,height:472});
 const size=warehousePaperSize(note);
 const {setNodeRef,attributes,listeners,isDragging}=useDraggable({id:`warehouse:${note.id}`,data:{kind:"warehouse",id:note.id}});
 useLayoutEffect(()=>{
  const element=slot.current?.closest<HTMLElement>('[aria-label="便签仓库"]');
  if(!element)return;
  setHost(element);
  const measure=()=>setBounds({width:element.clientWidth,height:element.clientHeight});
  measure();const observer=new ResizeObserver(measure);observer.observe(element);
  return ()=>observer.disconnect();
 },[]);
 const position=previewPosition??note.fridgePosition;
 const paper=<div data-warehouse-id={note.id} data-paper-group={group} data-warehouse-note data-note-color={note.color??"gray"} data-paper-shape data-folded-shape={note.foldedShape} className={styles.storedNote} data-selected={selected} data-magnet-held={magnetHeld||undefined} data-lifted={selected||undefined}
 style={{...size,opacity:isDragging?0:1,position:position?"absolute":"relative",left:position?position.x*Math.max(0,bounds.width-size.width):undefined,top:position?position.y*Math.max(0,bounds.height-size.height):undefined,transform:`translateY(9px)`,zIndex:magnetHeld?90:layer}}>
  <PaperSurface note={note}/>
  <button ref={setNodeRef} {...attributes} {...listeners} className={styles.warehouseHandle} aria-label={`拖动便签：${note.title||"未命名计划"}`} onPointerDownCapture={onSelect} onClick={onSelect}><WarehouseFace note={note}/></button>
 </div>;
 return <div ref={slot} className={styles.fridgeSlot} style={size}>{position&&host?createPortal(paper,host):paper}</div>;
}
