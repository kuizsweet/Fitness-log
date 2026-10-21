import sys,os
sys.path.insert(0,r'C:/Users/w4376/AppData/Local/Temp/kuizfit-video-tools')
import cv2
from PIL import Image,ImageDraw
video=r'D:/wx/xwechat_files/wxid_8w8bf9vpnxyk12_f502/temp/RWTemp/2026-10/fdf186d2b506bc19c5bdf01d74c1a197/7eeec41acdc4e5437773f0062f66166c.mp4'
c=cv2.VideoCapture(video); fps=c.get(cv2.CAP_PROP_FPS); n=c.get(cv2.CAP_PROP_FRAME_COUNT)
print('fps',fps,'frames',n,'seconds',n/fps,'size',c.get(3),c.get(4))
# Decode every frame. Keep changes in the exercise list, sampling no slower than 0.2s.
last=None; keep=[]; idx=0
while True:
 ok,f=c.read()
 if not ok:break
 if idx%max(1,round(fps*.2))==0:
  gray=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
  roi=gray[int(gray.shape[0]*.25):int(gray.shape[0]*.9)]
  small=cv2.resize(roi,(160,240))
  diff=100 if last is None else cv2.absdiff(small,last).mean()
  if diff>3:
   t=idx/fps; path=f'test-results/hevy-video/frame-{idx:05}.jpg';cv2.imwrite(path,f);keep.append((t,path));last=small
 idx+=1
c.release()
print('kept',len(keep))
# Full resolution frames remain available for inspection.
for start in range(0,len(keep),12):
 group=keep[start:start+12]; sheet=Image.new('RGB',(4*300,3*680),'#ddd');d=ImageDraw.Draw(sheet)
 for j,(t,p) in enumerate(group):
  im=Image.open(p);im.thumbnail((300,650));x=(j%4)*300;y=(j//4)*680;sheet.paste(im,(x,y+25));d.text((x+5,y+5),f'{start+j}: {t:.2f}s',(0,0,0))
 sheet.save(f'test-results/hevy-video/sheet-{start//12:02}.jpg')
import json
json.dump(keep,open('test-results/hevy-video/frames.json','w'))

