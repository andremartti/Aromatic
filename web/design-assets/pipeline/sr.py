import cv2, time, sys
scale=int(sys.argv[1]); src=sys.argv[2]; out=sys.argv[3]
sr=cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(f'edsr/models/EDSR_x{scale}.pb'); sr.setModel('edsr', scale)
img=cv2.imread(src); t=time.time()
# procesar en mosaicos con solape para limitar memoria
H,W=img.shape[:2]; T=240; P=16
import numpy as np
res=np.zeros((H*scale,W*scale,3),np.uint8)
for y in range(0,H,T):
  for x in range(0,W,T):
    y0,x0=max(0,y-P),max(0,x-P); y1,x1=min(H,y+T+P),min(W,x+T+P)
    up=sr.upsample(img[y0:y1,x0:x1])
    oy,ox=(y-y0)*scale,(x-x0)*scale; h,w=min(T,H-y)*scale,min(T,W-x)*scale
    res[y*scale:y*scale+h, x*scale:x*scale+w]=up[oy:oy+h, ox:ox+w]
cv2.imwrite(out,res,[cv2.IMWRITE_PNG_COMPRESSION,3]); print('done',time.time()-t)
