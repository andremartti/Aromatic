import cv2, numpy as np
img=cv2.imread('../aromatic-escena-original.jpg')  # foto oficial 720x1440
H,W=img.shape[:2]
def gc(rect, fg_polys=(), bg_polys=(), it=8):
    mask=np.zeros((H,W),np.uint8); mask[:]=cv2.GC_BGD
    x,y,w,h=rect; mask[y:y+h,x:x+w]=cv2.GC_PR_FGD
    for p in fg_polys: cv2.fillPoly(mask,[np.array(p,np.int32)],cv2.GC_FGD)
    for p in bg_polys: cv2.fillPoly(mask,[np.array(p,np.int32)],cv2.GC_BGD)
    bgd=np.zeros((1,65),np.float64); fgd=np.zeros((1,65),np.float64)
    cv2.grabCut(img,mask,None,bgd,fgd,it,cv2.GC_INIT_WITH_MASK)
    return np.where((mask==1)|(mask==3),255,0).astype(np.uint8)
# Jabón (frente): rect y polígono seguro interior
jab=gc((498,640,198,470),
  fg_polys=[[(510,820),(685,820),(688,1060),(515,1080)],[(560,705),(612,705),(612,760),(560,760)],[(530,655),(615,655),(615,690),(530,690)]],
  bg_polys=[[(480,620),(498,620),(498,1120),(480,1120)],[(620,620),(720,620),(720,700),(620,700)]])
# Suavizante
suav=gc((25,395,285,690),
  fg_polys=[[(45,560),(250,560),(255,1060),(45,1060)],[(110,410),(215,410),(215,470),(110,470)]],
  bg_polys=[[(0,380),(22,380),(22,900),(0,900)],[(0,930),(48,925),(70,960),(72,1010),(55,1060),(0,1080)]])
cv2.polylines(suav,[np.array([(232,440),(268,468),(292,535),(299,605),(287,652)],np.int32)],False,255,13)
cv2.imwrite('m_jabon.png',jab)
# Detergente: rect menos jabón y suavizante
det=gc((280,375,285,710),
  fg_polys=[[(300,560),(495,560),(495,1060),(300,1060)],[(370,400),(470,400),(470,470),(370,470)]],
  bg_polys=[])
cv2.polylines(det,[np.array([(472,440),(514,462),(543,528),(553,605),(545,680)],np.int32)],False,255,13)
det[jab>0]=0
suav[det>0]=suav[det>0]  # (suavizante delante: sin cambio)
cv2.imwrite('m_suav.png',suav)
cv2.imwrite('m_det.png',det)
# overlay preview
ov=img.copy().astype(np.float32)
for m,c in ((suav,(0,200,0)),(det,(200,0,0)),(jab,(0,0,255))):
    sel=m>0; ov[sel]=ov[sel]*0.55+np.array(c)*0.45
cv2.imwrite('seg-preview.png',ov[350:1150].astype(np.uint8))
