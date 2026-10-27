"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { clampFridgePosition, fridgePaperDelta, magnetInPaperUpperHalf } from "@/lib/training-workbench";
import styles from "./TrainingWorkbench.module.css";
type Magnet = { id: string; x: number; y: number };
type Paper = {noteId:string;left:number;top:number;width:number;height:number};
export type MagnetPaperMove = {noteId:string;position:{x:number;y:number};commit?:boolean;cancel?:boolean};
const defaults: Magnet[] = [
 {id:"magnet-1",x:.22,y:.12},
 {id:"magnet-2",x:.30,y:.485},
 {id:"magnet-3",x:.69,y:.485},
 {id:"magnet-4",x:.30,y:.735},
 {id:"magnet-5",x:.69,y:.735},
];
export function FridgeMagnets({storageKey,onPaperMove}:{storageKey:string;onPaperMove:(movement:MagnetPaperMove)=>void}) {
 const [magnets,setMagnets]=useState(defaults);
 const [held,setHeld]=useState<string|null>(null);
 const drag=useRef<{id:string;startX:number;startY:number;origin:Magnet;paper?:Paper}|null>(null);
 const latest=useRef(magnets);
 const layer=useRef<HTMLDivElement>(null);
 const [size,setSize]=useState({width:280,height:472});
 useEffect(()=>{
  try {
   const raw=localStorage.getItem(storageKey);
   const saved=raw?JSON.parse(raw):null;
   const restored=Array.isArray(saved)&&saved.length===5&&defaults.every((item,index)=>saved[index]?.id===item.id&&[saved[index].x,saved[index].y].every((v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=1))?saved:defaults;
   latest.current=restored;setMagnets(restored);
  } catch { latest.current=defaults;setMagnets(defaults); }
 },[storageKey]);
 useEffect(()=>{
  const host=layer.current?.parentElement;if(!host)return;
  const measure=()=>setSize({width:host.clientWidth,height:host.clientHeight});
  measure();const observer=new ResizeObserver(measure);observer.observe(host);
  return ()=>observer.disconnect();
 },[]);
 function attachedPaper(magnet:Magnet):Paper|undefined {
  const host=layer.current?.parentElement;if(!host)return;
  const box=host.getBoundingClientRect();
  const x=box.left+21+magnet.x*Math.max(0,size.width-42);
  const y=box.top+21+magnet.y*Math.max(0,size.height-42);
  // Pick up the topmost paper held under this magnet, including the source stack.
  return [...host.querySelectorAll<HTMLElement>('[data-warehouse-id], [data-new-note-source]')]
   .filter(element=>{const rect=element.getBoundingClientRect();return magnetInPaperUpperHalf({x,y},{left:rect.left,top:rect.top,width:rect.width,height:rect.height});})
   .sort((a,b)=>(Number(getComputedStyle(b).zIndex)||0)-(Number(getComputedStyle(a).zIndex)||0))
   .map(element=>{const rect=element.getBoundingClientRect();return {noteId:element.dataset.warehouseId??"new-note-source",left:rect.left-box.left,top:rect.top-box.top,width:rect.width,height:rect.height};})[0];
 }
 function paperPosition(paper:Paper,dx:number,dy:number) {
  return clampFridgePosition((paper.left+dx)/Math.max(1,size.width-paper.width),(paper.top+dy-9)/Math.max(1,size.height-paper.height));
 }
 function move(origin:Magnet,x:number,y:number,paper?:Paper) {
  let point=clampFridgePosition(x,y);
  if(paper) {
   const delta=fridgePaperDelta((point.x-origin.x)*Math.max(1,size.width-42),(point.y-origin.y)*Math.max(1,size.height-42),paper,size);
   point=clampFridgePosition(origin.x+delta.x/Math.max(1,size.width-42),origin.y+delta.y/Math.max(1,size.height-42));
   onPaperMove({noteId:paper.noteId,position:paperPosition(paper,delta.x,delta.y)});
  }
  latest.current=latest.current.map(m=>m.id===origin.id?{...m,...point}:m);
  setMagnets(latest.current);
 }
 function save() { try {localStorage.setItem(storageKey,JSON.stringify(latest.current));} catch {console.warn("磁铁位置未能保存");} }
 function start(event:PointerEvent<HTMLButtonElement>,magnet:Magnet) {
  if(event.button!==0)return;
  event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);
  const paper=attachedPaper(magnet);
  drag.current={id:magnet.id,startX:event.clientX,startY:event.clientY,origin:magnet,paper};
  setHeld(magnet.id);
  if(paper)onPaperMove({noteId:paper.noteId,position:paperPosition(paper,0,0)});
 }
 function end(cancel=false) {
  const current=drag.current;if(!current)return;
  if(cancel) {
   latest.current=latest.current.map(m=>m.id===current.id?current.origin:m);setMagnets(latest.current);
  } else save();
  if(current.paper) {
   const magnet=latest.current.find(m=>m.id===current.id)!;
   onPaperMove({noteId:current.paper.noteId,position:paperPosition(current.paper,(magnet.x-current.origin.x)*Math.max(1,size.width-42),(magnet.y-current.origin.y)*Math.max(1,size.height-42)),commit:!cancel,cancel});
  }
  drag.current=null;setHeld(null);
 }
 return <div ref={layer} className={styles.fridgeMagnets}>
  {magnets.map((magnet,index)=><button key={magnet.id} aria-label={`磁铁 ${index+1}`} data-fridge-magnet data-fridge-magnet-id={magnet.id} data-held={held===magnet.id||undefined}
   className={styles.independentMagnet}
   style={{transform:`translate3d(${12+magnet.x*Math.max(0,size.width-42)}px, ${12+magnet.y*Math.max(0,size.height-42)}px, 0)`}}
   onPointerDown={event=>start(event,magnet)}
   onPointerMove={event=>{const current=drag.current;if(!current||current.id!==magnet.id)return;move(current.origin,current.origin.x+(event.clientX-current.startX)/Math.max(1,size.width-42),current.origin.y+(event.clientY-current.startY)/Math.max(1,size.height-42),current.paper);}}
   onPointerUp={()=>end()} onPointerCancel={()=>end(true)} onLostPointerCapture={()=>{if(drag.current)end(true);}}
   onKeyDown={event=>{if(event.key==="Escape"&&drag.current){event.preventDefault();end(true);return;}const delta:Record<string,[number,number]>={ArrowLeft:[-.03,0],ArrowRight:[.03,0],ArrowUp:[0,-.03],ArrowDown:[0,.03]};const step=delta[event.key];if(!step)return;event.preventDefault();event.stopPropagation();drag.current={id:magnet.id,startX:0,startY:0,origin:magnet,paper:attachedPaper(magnet)};move(magnet,magnet.x+step[0],magnet.y+step[1],drag.current.paper);end();}}
  />)}
 </div>;
}
