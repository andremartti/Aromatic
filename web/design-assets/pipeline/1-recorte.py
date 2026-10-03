# Recorte del fondo con rembg (modelo isnet-general-use).
# Uso: python 1-recorte.py  (lee ../originales/*.jpg, escribe <producto>-isnet.png)
from rembg import remove, new_session
from PIL import Image
s = new_session("isnet-general-use")
for n in ["detergente", "suavizante", "jabon"]:
    remove(Image.open(f"../originales/{n}.jpg"), session=s).save(f"{n}-isnet.png")
