# -*- coding: utf-8 -*-
"""
Catálogo de productos AROMATIC extraído del PDF "Catalogo_AROMATIC-2016-C.pdf".

REGLA CRÍTICA: los precios contenidos en este archivo son EXCLUSIVAMENTE
"Precio de referencia del catálogo" (2016). Son informativos y NO deben
alimentar ningún cálculo financiero del sistema. El sistema trabaja con el
campo "Precio de venta actual", que se ingresa manualmente y nace vacío.

Los costos NO están en el catálogo: se dejan vacíos (PENDIENTE) a propósito.
"""

# (sku, nombre, categoria, subcategoria, presentacion, unidad, contenido_ml,
#  aromas, precio_referencia_catalogo_2016)
PRODUCTOS = [
    # --- HOGAR / DESINFECCIÓN PERSONAL ---
    ("GEL-250",  "Gel Desinfectante Antibacterial", "Hogar", "Desinfección personal", "250 mL",  "Unidad", 250,   "Original, Papaya, Fresa", 35.00),
    ("GEL-500",  "Gel Desinfectante Antibacterial", "Hogar", "Desinfección personal", "500 mL",  "Unidad", 500,   "Original, Papaya, Fresa", 70.00),
    ("GEL-2L",   "Gel Desinfectante Antibacterial", "Hogar", "Desinfección personal", "2 Litros","Unidad", 2000,  "Original, Papaya, Fresa", 140.00),
    ("GEL-GAL",  "Gel Desinfectante Antibacterial", "Hogar", "Desinfección personal", "Galón",   "Unidad", 3785,  "Original, Papaya, Fresa", 330.00),

    ("JAB-500",  "Jabón Líquido para Manos", "Hogar", "Cuidado personal", "500 mL",   "Unidad", 500,  "Chicle, Floral, Frutas tropicales, Coco, Cherry, Fresh", 60.00),
    ("JAB-2L",   "Jabón Líquido para Manos", "Hogar", "Cuidado personal", "2 Litros", "Unidad", 2000, "Chicle, Floral, Frutas tropicales, Coco, Cherry, Fresh", 100.00),
    ("JAB-GAL",  "Jabón Líquido para Manos", "Hogar", "Cuidado personal", "Galón",    "Unidad", 3785, "Chicle, Floral, Frutas tropicales, Coco, Cherry, Fresh", 150.00),

    # --- LAVANDERÍA ---
    ("SUA-GAL",  "Suavizante sin Enjuague", "Lavandería", "Suavizantes", "Galón", "Unidad", 3785, "Floral", 130.00),
    ("DET-GAL",  "Detergente Líquido para Lavadora", "Lavandería", "Detergentes", "Galón", "Unidad", 3785, "Floral", 140.00),

    # --- LIMPIEZA DEL HOGAR ---
    ("VID-750",  "Limpiador de Vidrios", "Limpieza Hogar", "Vidrios y cristales", "750 mL", "Unidad", 750,  "Sin aroma específico", 60.00),
    ("VID-GAL",  "Limpiador de Vidrios", "Limpieza Hogar", "Vidrios y cristales", "Galón",  "Unidad", 3785, "Sin aroma específico", 120.00),

    ("LAV-500",  "Deterlente Lavaplatos", "Limpieza Hogar", "Cocina", "500 mL", "Unidad", 500,  "Limón", 50.00),
    ("LAV-GAL",  "Deterlente Lavaplatos", "Limpieza Hogar", "Cocina", "Galón",  "Unidad", 3785, "Limón", 130.00),

    ("DES-750",  "Limpiador Desengrasante de Cocina", "Limpieza Hogar", "Cocina", "750 mL", "Unidad", 750,  "Naranja", 65.00),
    ("DES-GAL",  "Limpiador Desengrasante de Cocina", "Limpieza Hogar", "Cocina", "Galón",  "Unidad", 3785, "Naranja", 135.00),

    ("ACE-250",  "Aceite Rojo para Muebles", "Limpieza Hogar", "Muebles y madera", "250 mL", "Unidad", 250,  "Original", 50.00),
    ("ACE-GAL",  "Aceite Rojo para Muebles", "Limpieza Hogar", "Muebles y madera", "Galón",  "Unidad", 3785, "Original", 380.00),

    ("MUL-900",  "Limpiador Desinfectante Multiusos", "Limpieza Hogar", "Pisos y multiusos", "900 mL",   "Unidad", 900,  "Lavanda, Floral, Chicle, Campo de Flores, Pino, Manzana Verde, Manzana Canela, Bebé, Limón", 25.00),
    ("MUL-GAL",  "Limpiador Desinfectante Multiusos", "Limpieza Hogar", "Pisos y multiusos", "Galón",    "Unidad", 3785, "Lavanda, Floral, Chicle, Campo de Flores, Pino, Manzana Verde, Manzana Canela, Bebé, Limón", 80.00),
    ("MUL-5L",   "Limpiador Desinfectante Multiusos", "Limpieza Hogar", "Pisos y multiusos", "5 Litros", "Unidad", 5000, "Lavanda, Floral, Chicle, Campo de Flores, Pino, Manzana Verde, Manzana Canela, Bebé, Limón", 100.00),

    ("ODO-250",  "Odorless Eliminador de Olores", "Limpieza Hogar", "Aromatización y desinfección", "250 mL", "Unidad", 250, "Manzana Canela, Limón", 50.00),

    ("BAN-750",  "Bañopurific Limpiador Desinfectante", "Limpieza Hogar", "Baños", "750 mL", "Unidad", 750,  "Sin aroma específico", 75.00),
    ("BAN-GAL",  "Bañopurific Limpiador Desinfectante", "Limpieza Hogar", "Baños", "Galón",  "Unidad", 3785, "Sin aroma específico", 150.00),

    ("CAN-1L",   "Desatorador de Cañerías", "Limpieza Hogar", "Baños", "1 Litro", "Unidad", 1000, "Sin aroma específico", 130.00),
    ("CAN-GAL",  "Desatorador de Cañerías", "Limpieza Hogar", "Baños", "Galón",   "Unidad", 3785, "Sin aroma específico", 400.00),

    # --- LÍNEA AUTOMOTRIZ ---
    ("SHA-250",  "Shampoo para Auto", "Automotriz", "Lavado", "250 mL",   "Unidad", 250,  "Original", 30.00),
    ("SHA-2L",   "Shampoo para Auto", "Automotriz", "Lavado", "2 Litros", "Unidad", 2000, "Original", 80.00),
    ("SHA-GAL",  "Shampoo para Auto", "Automotriz", "Lavado", "Galón",    "Unidad", 3785, "Original", 100.00),

    ("ARO-100",  "Aromatizante para Auto", "Automotriz", "Aromatización", "100 mL", "Unidad", 100, "Manzana Canela, Limón, Chicle, Fresh", 45.00),
    ("ARO-250",  "Aromatizante para Auto", "Automotriz", "Aromatización", "250 mL", "Unidad", 250, "Manzana Canela, Limón, Chicle, Fresh", 65.00),

    ("PAU-250",  "Puli-Auto Abrillantador y Protector", "Automotriz", "Abrillantadores", "250 mL", "Unidad", 250,  "Original", 50.00),
    ("PAU-GAL",  "Puli-Auto Abrillantador y Protector", "Automotriz", "Abrillantadores", "Galón",  "Unidad", 3785, "Original", 170.00),

    ("PLL-710",  "Puli-Llanta en Crema", "Automotriz", "Abrillantadores", "710 mL", "Unidad", 710,  "Original", 75.00),
    ("PLL-TAR",  "Puli-Llanta en Crema", "Automotriz", "Abrillantadores", "Tarro",  "Unidad", None, "Original", 50.00),
    ("PLL-GAL",  "Puli-Llanta en Crema", "Automotriz", "Abrillantadores", "Galón",  "Unidad", 3785, "Original", 190.00),

    # --- LÍNEA INDUSTRIAL ---
    ("PMA-8OZ",  "Puli-Manos Crema Limpiadora", "Industrial", "Limpieza de manos", "8 Onzas", "Unidad", 237,  "Original", 40.00),
    ("PMA-1L",   "Puli-Manos Crema Limpiadora", "Industrial", "Limpieza de manos", "1 Litro", "Unidad", 1000, "Original", 95.00),
    ("PMA-GAL",  "Puli-Manos Crema Limpiadora", "Industrial", "Limpieza de manos", "Galón",   "Unidad", 3785, "Original", 300.00),

    ("DEI-1L",   "Desengrasante Industrial", "Industrial", "Desengrasantes", "1 Litro", "Unidad", 1000, "Sin aroma específico", 100.00),
    ("DEI-GAL",  "Desengrasante Industrial", "Industrial", "Desengrasantes", "Galón",   "Unidad", 3785, "Sin aroma específico", 300.00),
]

CATEGORIAS = ["Hogar", "Lavandería", "Limpieza Hogar", "Automotriz", "Industrial"]

SUBCATEGORIAS = [
    "Desinfección personal", "Cuidado personal", "Suavizantes", "Detergentes",
    "Vidrios y cristales", "Cocina", "Muebles y madera", "Pisos y multiusos",
    "Aromatización y desinfección", "Baños", "Lavado", "Aromatización",
    "Abrillantadores", "Limpieza de manos", "Desengrasantes",
]

PRESENTACIONES = ["100 mL", "250 mL", "500 mL", "710 mL", "750 mL", "900 mL",
                  "1 Litro", "2 Litros", "5 Litros", "Galón", "8 Onzas", "Tarro"]
