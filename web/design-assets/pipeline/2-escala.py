# Recorta al contenido (+14 px), escala x2 con EDSR (OpenCV dnn_superres) y aplica el alfa escalado.
# Modelo EDSR_x2.pb: repositorio Saafke/EDSR_Tensorflow.
import cv2, numpy as np
from PIL import Image
sr=cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel('EDSR_x2.pb'); sr.setModel('edsr',2)
def upscale(img):
    H,W=img.shape[:2]; T=200; P=12; S=2
    res=np.zeros((H*S,W*S,3),np.uint8)
    for y in range(0,H,T):
        for x in range(0,W,T):
            y0,x0=max(0,y-P),max(0,x-P); y1,x1=min(H,y+T+P),min(W,x+T+P)
            up=sr.upsample(img[y0:y1,x0:x1]); oy,ox=(y-y0)*S,(x-x0)*S; h,w=min(T,H-y)*S,min(T,W-x)*S
            res[y*S:y*S+h,x*S:x*S+w]=up[oy:oy+h,ox:ox+w]
    return res
for n in ['detergente','suavizante','jabon']:
    rgba=np.array(Image.open(f'{n}-isnet.png').convert('RGBA'))
    src=cv2.imread(f'../originales/{n}.jpg')
    a=rgba[...,3]; ys,xs=np.where(a>8); m=14
    x0,y0,x1,y1=max(0,xs.min()-m),max(0,ys.min()-m),min(a.shape[1],xs.max()+m),min(a.shape[0],ys.max()+m)
    up=upscale(src[y0:y1,x0:x1])
    al=cv2.resize(a[y0:y1,x0:x1],(up.shape[1],up.shape[0]),interpolation=cv2.INTER_CUBIC)
    out=np.dstack([cv2.cvtColor(up,cv2.COLOR_BGR2RGB),al])
    Image.fromarray(out).save(f'{n}-2x.png'); print(n,out.shape,(x0,y0))
