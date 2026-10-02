from PIL import Image
import numpy as np, cv2
S=3
X0,Y0,X1,Y1=490,635,705,1112           # caja del jabón (px originales)
up=cv2.imread('up3.png')[Y0*S:Y1*S, X0*S:X1*S]
m=cv2.imread('mf_jabon.png',0)
poly=np.array([(517,647),(617,645),(619,669),(609,673),(611,700),(617,703),(618,758),(650,774),(676,800),(690,830),(693,1040),(674,1050),(658,1074),(652,1100),(530,1101),(511,1086),(503,1050),(503,830),(515,800),(540,777),(557,761),(557,703),(564,700),(565,673),(558,669),(519,664)],np.int32)
def chaikin(p,n=3):
    p=p.astype(np.float32)
    for _ in range(n):
        q=np.roll(p,-1,axis=0); p=np.vstack([np.c_[0.75*p+0.25*q],np.c_[0.25*p+0.75*q]]).reshape(2,-1,2).transpose(1,0,2).reshape(-1,2)
    return p
sp=chaikin(poly)*S
big=np.zeros((1440*S,720*S),np.uint8); cv2.fillPoly(big,[np.round(sp).astype(np.int32)],255,lineType=cv2.LINE_AA)
gcm=cv2.resize(m,(720*S,1440*S),interpolation=cv2.INTER_LINEAR)
# GrabCut solo recorta dentro del polígono suavizado en los bordes finos (dosificador)
big=np.where(np.arange(1440*S)[:,None]<700*S, cv2.min(big,cv2.dilate(gcm,np.ones((9,9),np.uint8))), big)
big=cv2.GaussianBlur(big,(0,0),1.6)
m=cv2.resize(big,(720,1440),interpolation=cv2.INTER_AREA).astype(np.float32)
BIGMASK=big
m=BIGMASK[Y0*S:Y1*S, X0*S:X1*S].astype(np.float32)/255.0
h,w=up.shape[:2]
lab=cv2.cvtColor(up,cv2.COLOR_BGR2LAB).astype(np.float32)
L,A,B=lab[...,0],lab[...,1]-128,lab[...,2]-128
yy,xx=np.mgrid[0:h,0:w]; ys=yy/S+Y0; xs=xx/S+X0
chroma=np.hypot(A,B)
# Líquido: dentro del envase, por debajo del hombro, con croma rosado; fuera de etiqueta y dosificador
inside=(cv2.erode((m>0.5).astype(np.uint8),np.ones((9,9),np.uint8))>0)
hue=np.degrees(np.arctan2(B,A))
pinkish=np.clip((chroma-6)/10,0,1)*((hue>-40)&(hue<70))
label=((ys>870)&(ys<1048)).astype(np.float32)
label=cv2.GaussianBlur(label,(0,0),4)
top=np.clip((ys-748)/14,0,1)                   # nada por encima del hombro (collar y dosificador)
w_liq=inside*pinkish*(1-label)*top
w_liq=cv2.GaussianBlur(w_liq.astype(np.float32),(0,0),2.0)
mean_c=np.average(chroma,weights=w_liq+1e-6)
cv2.imwrite('liquid-weight.png',(w_liq*255).astype(np.uint8))
targets={  # a*, b*, dL, factor de croma
 'chicle':None,
 'floral':(16,-9,1,1.0),
 'frutas-tropicales':(13,24,1,1.05),
 'coco':(3,12,10,0.35),
 'cherry':(34,12,-7,1.1),
 'fresh':(-9,-1,2,0.65),
}
alpha=(np.clip(m,0,1)*255).astype(np.uint8)
for name,t in targets.items():
    if t is None:
        out=up.copy()
    else:
        ta,tb,dl,f=t
        k=np.clip(chroma/(mean_c+1e-6),0,2.2)*f
        nA=A*(1-w_liq)+w_liq*(ta*k); nB=B*(1-w_liq)+w_liq*(tb*k); nL=L+w_liq*dl*2.55
        o=np.dstack([np.clip(nL,0,255),np.clip(nA+128,0,255),np.clip(nB+128,0,255)]).astype(np.uint8)
        out=cv2.cvtColor(o,cv2.COLOR_LAB2BGR)
    rgba=cv2.cvtColor(out,cv2.COLOR_BGR2BGRA); rgba[...,3]=alpha
    im=Image.fromarray(cv2.cvtColor(rgba,cv2.COLOR_BGRA2RGBA))
    im=im.resize((im.width*2//3, im.height*2//3),Image.LANCZOS)   # 430x954 aprox (2x de uso)
    im.save(f'out/jabon-{name}.webp',quality=86,method=6)
    im.save(f'out/jabon-{name}.png',optimize=True)
print('mean chroma',mean_c, 'size', w, h)
