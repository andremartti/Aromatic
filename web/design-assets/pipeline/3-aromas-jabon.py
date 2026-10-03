# Aromas del jabón: recolorea solo el líquido (tono ámbar con croma), fuera de la etiqueta (y 731–1594).
# El original (ámbar) se usa como Frutas tropicales.
import cv2,numpy as np
from PIL import Image
im=np.array(Image.open('jabon-2x.png')); rgb=im[...,:3]; alpha=im[...,3]
lab=cv2.cvtColor(rgb,cv2.COLOR_RGB2LAB).astype(np.float32)
L,A,B=lab[...,0]*100/255,lab[...,1]-128,lab[...,2]-128
C=np.hypot(A,B); h=np.degrees(np.arctan2(B,A))
# peso del líquido: tono ámbar con croma, fuera de la etiqueta (y 731–1594)
w=np.clip((C-14)/18,0,1)*((h>45)&(h<105))*(alpha>40)
yy=np.arange(L.shape[0])[:,None]
w=w*((yy<727)|(yy>1598))
w=cv2.GaussianBlur(w.astype(np.float32),(0,0),1.5)
mC=float(C[w>0.8].mean())
T={ # nombre: (hue°, croma, dL)
 'chicle':(8,30,7),'floral':(-55,26,5),'coco':(75,8,40),'cherry':(22,58,-15),'fresh':(-160,24,8)}
out={'frutas-tropicales':rgb}
for n,(hd,ch,dl) in T.items():
    r=C/mC; th=np.radians(hd)
    nA=np.cos(th)*ch*r; nB=np.sin(th)*ch*r
    nL=np.clip(L+dl*(1-(L/100)**2)*1.3,0,100)
    LL=L*(1-w)+nL*w; AA=A*(1-w)+nA*w; BB=B*(1-w)+nB*w
    lab2=np.dstack([LL*255/100,AA+128,BB+128]).clip(0,255).astype(np.uint8)
    out[n]=cv2.cvtColor(lab2,cv2.COLOR_LAB2RGB)
tiles=[]
for n,img in out.items():
    o=np.dstack([img,alpha]); Image.fromarray(o).save(f'jabon-{n}.png')
    bg=Image.new('RGBA',(850,1778),(248,243,236,255)); bg.alpha_composite(Image.fromarray(o)); tiles.append(bg.convert('RGB').resize((300,628)))
s=Image.new('RGB',(310*6,628),'white')
for i,t in enumerate(tiles): s.paste(t,(i*310,0))
s.save('aromas.png'); print(list(out))
