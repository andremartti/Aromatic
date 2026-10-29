/**
 * Guías de envío: códigos (QR y Code128) y PDF A4 con los mismos datos que la
 * plantilla de impresión. Nada de pagos: solo el monto a cobrar en contra
 * entrega, que el repartidor necesita.
 */
import qrcode from "qrcode-generator";
import { money } from "@/lib/shop/money";

export interface Guide {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  isTest: boolean;
  guideNumber: string;
  carrier: string | null;
  tracking: string | null;
  packages: number;
  weightKg: number | null;
  declaredValue: number | null;
  contents: string | null;
  handlingNotes: string | null;
  printCount: number;
  currency: string;
  collectOnDelivery: number | null;
  recipient: {
    name: string; buyerName: string; phone: string; altPhone: string | null; country: string; department: string;
    city: string; neighborhood: string | null; address: string; reference: string | null; instructions: string | null;
  };
}
export interface Sender { name: string; phone: string | null; address: string | null; city: string | null; department: string | null; country: string }
export interface GuidesData { sender: Sender; guides: Guide[] }

const dateFmt = new Intl.DateTimeFormat("es-HN", { timeZone: "America/Tegucigalpa", day: "2-digit", month: "2-digit", year: "numeric" });
export const guideDate = (v: string) => dateFmt.format(new Date(v));
export const phoneHN = (v: string | null) => {
  if (!v) return "";
  const m = /^\+504(\d{4})(\d{4})$/.exec(v);
  return m ? `${m[1]}-${m[2]}` : v;
};
export const weightText = (g: Guide) => (g.weightKg ? `${Number(g.weightKg).toLocaleString("es-HN")} kg` : "—");
export const valueText = (g: Guide) => (g.declaredValue !== null && g.declaredValue !== undefined ? money(g.declaredValue, g.currency) : "—");

/** Dirección en texto plano (para copiar y pegar en la plataforma de la transportista). */
export function addressText(g: Guide): string {
  const r = g.recipient;
  return [
    r.name,
    `Tel. ${phoneHN(r.phone)}${r.altPhone ? ` / ${phoneHN(r.altPhone)}` : ""}`,
    [r.address, r.neighborhood].filter(Boolean).join(", "),
    `${r.city}, ${r.department}, ${r.country}`,
    r.reference ? `Referencias: ${r.reference}` : null,
    r.instructions ? `Indicaciones: ${r.instructions}` : null,
  ].filter(Boolean).join("\n");
}

/** Contenido del QR: el pedido en el panel (requiere iniciar sesión; no expone datos). */
export function qrPayload(g: Guide): string {
  const base = typeof window !== "undefined" ? `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}` : "";
  return `${base}/admin/pedido/?id=${g.orderId}`;
}

/** QR como SVG (rutas, sin dependencias de canvas). */
export function qrSvg(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const q = 2; // zona de silencio
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q},${r + q}h1v1h-1z`;
  const size = n + q * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

/** Code128 como SVG (JsBarcode dibuja sobre un elemento SVG del documento). */
export async function barcodeSvg(text: string): Promise<string> {
  const { default: JsBarcode } = await import("jsbarcode");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, text, { format: "CODE128", displayValue: false, margin: 0, height: 60, width: 2, background: "#ffffff", lineColor: "#000000" });
  return new XMLSerializer().serializeToString(svg);
}

/* ---------------------------------------------------------------------------
 *  PDF (pdfmake se carga solo al pedir la descarga)
 * ------------------------------------------------------------------------- */
type Node = Record<string, unknown> | string;

export async function downloadGuidesPdf(data: GuidesData, filename: string): Promise<void> {
  const [{ default: pdfMake }, vfsModule] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
  const vfs = (vfsModule as { default?: unknown }).default ?? vfsModule;
  (pdfMake as unknown as { vfs: unknown }).vfs = (vfs as { pdfMake?: { vfs: unknown } }).pdfMake?.vfs ?? vfs;

  const barcodes = await Promise.all(data.guides.map((g) => barcodeSvg(g.guideNumber)));
  const s = data.sender;
  const label = (t: string): Node => ({ text: t.toUpperCase(), style: "label" });
  const cell = (t: string, v: string): Node => ({ stack: [label(t), { text: v || "—", style: "meta" }] });

  const content: Node[] = data.guides.map((g, i) => {
    const r = g.recipient;
    const stack: Node[] = [
      {
        columns: [
          { stack: [{ text: "AROMATIC", style: "brand" }, { text: "Home care · Honduras", style: "brandSub" }], width: "*" },
          {
            width: 200,
            stack: [
              { text: "GUÍA DE ENVÍO", style: "label", alignment: "right" },
              { text: g.guideNumber, style: "guideNo", alignment: "right" },
              { svg: barcodes[i], width: 180, height: 44, alignment: "right" },
            ],
          },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 6, x2: 515, y2: 6, lineWidth: 1.5 }], margin: [0, 0, 0, 10] },
      {
        columns: [
          {
            width: 190,
            stack: [
              label("Remitente"),
              { text: s.name, bold: true, fontSize: 12 },
              { text: s.phone ? `Tel. ${s.phone}` : "Teléfono por definir", margin: [0, 2, 0, 0] },
              { text: s.address ?? "Dirección por definir" },
              { text: [s.city, s.department, s.country].filter(Boolean).join(", ") },
            ],
          },
          {
            width: "*",
            stack: [
              label("Destinatario"),
              { text: r.name, bold: true, fontSize: 17 },
              r.buyerName && r.buyerName !== r.name ? { text: `Compra: ${r.buyerName}`, fontSize: 9, color: "#444" } : "",
              { text: `Tel. ${phoneHN(r.phone)}${r.altPhone ? `  /  ${phoneHN(r.altPhone)}` : ""}`, bold: true, fontSize: 12, margin: [0, 4, 0, 2] },
              { text: [r.address, r.neighborhood].filter(Boolean).join(", "), fontSize: 12 },
              { text: `${r.city}, ${r.department}`.toUpperCase(), bold: true, fontSize: 13, margin: [0, 3, 0, 0] },
              { text: r.country },
              r.reference ? { text: [{ text: "Referencias: ", bold: true }, r.reference], margin: [0, 4, 0, 0] } : "",
            ],
          },
        ],
        columnGap: 16,
      },
      { canvas: [{ type: "line", x1: 0, y1: 8, x2: 515, y2: 8, lineWidth: 0.75 }], margin: [0, 0, 0, 8] },
      {
        columns: [
          cell("Pedido", g.orderNumber), cell("Fecha", guideDate(g.createdAt)), cell("Transportista", g.carrier ?? "Por asignar"), cell("Seguimiento", g.tracking ?? "—"),
        ],
        columnGap: 10,
      },
      {
        columns: [cell("Paquetes", String(g.packages)), cell("Peso", weightText(g)), cell("Valor declarado", valueText(g)), cell("Impresión", String(Math.max(1, g.printCount)))],
        columnGap: 10,
        margin: [0, 8, 0, 0],
      },
      { canvas: [{ type: "line", x1: 0, y1: 8, x2: 515, y2: 8, lineWidth: 0.5, lineColor: "#999" }], margin: [0, 0, 0, 8] },
      { stack: [label("Contenido"), { text: g.contents ?? "Productos AROMATIC" }] },
      r.instructions ? { stack: [label("Indicaciones de entrega"), { text: r.instructions }], margin: [0, 8, 0, 0] } : "",
      g.handlingNotes ? { stack: [label("Manejo"), { text: g.handlingNotes, bold: true }], margin: [0, 8, 0, 0] } : "",
      g.collectOnDelivery !== null
        ? { table: { widths: ["*"], body: [[{ text: `COBRAR AL ENTREGAR: ${money(g.collectOnDelivery, g.currency)}`, bold: true, fontSize: 14, margin: [6, 6, 6, 6] }]] }, margin: [0, 12, 0, 0] }
        : "",
    ];
    return {
      stack: [
        ...stack,
        {
          absolutePosition: { x: 40, y: 640 },
          columns: [
            { width: 100, stack: [{ qr: qrPayload(g), fit: 96, eccLevel: "M" }, { text: "Pedido en el panel", fontSize: 7, color: "#555", margin: [0, 3, 0, 0] }] },
            {
              width: "*",
              stack: [
                label("Recibí conforme"),
                {
                  columns: [
                    { stack: [{ canvas: [{ type: "line", x1: 0, y1: 26, x2: 190, y2: 26, lineWidth: 0.75 }] }, { text: "Nombre de quien recibe", fontSize: 7.5 }] },
                    { stack: [{ canvas: [{ type: "line", x1: 0, y1: 26, x2: 190, y2: 26, lineWidth: 0.75 }] }, { text: "Identidad", fontSize: 7.5 }] },
                  ],
                  columnGap: 14,
                },
                {
                  columns: [
                    { stack: [{ canvas: [{ type: "line", x1: 0, y1: 26, x2: 190, y2: 26, lineWidth: 0.75 }] }, { text: "Firma", fontSize: 7.5 }] },
                    { stack: [{ canvas: [{ type: "line", x1: 0, y1: 26, x2: 190, y2: 26, lineWidth: 0.75 }] }, { text: "Fecha y hora", fontSize: 7.5 }] },
                  ],
                  columnGap: 14,
                  margin: [0, 6, 0, 0],
                },
              ],
            },
          ],
          columnGap: 16,
        },
      ],
      pageBreak: i < data.guides.length - 1 ? "after" : undefined,
    };
  });

  const doc = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: { title: filename.replace(/\.pdf$/, ""), author: "AROMATIC" },
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.2, color: "#111" },
    styles: {
      brand: { fontSize: 22, bold: true, characterSpacing: 4 },
      brandSub: { fontSize: 8.5, color: "#444", margin: [0, 3, 0, 0] },
      guideNo: { fontSize: 17, bold: true, margin: [0, 1, 0, 4] },
      label: { fontSize: 7.5, bold: true, color: "#333", characterSpacing: 1, margin: [0, 0, 0, 2] },
      meta: { fontSize: 11, bold: true },
    },
    // Guías de pedidos de prueba: marca de agua en todo el documento.
    watermark: data.guides.some((g) => g.isTest) ? { text: "PRUEBA", color: "#000000", opacity: 0.06, bold: true, angle: -24 } : undefined,
    content,
  };
  // pdfmake tipa el documento de forma muy estricta; la estructura de arriba es la documentada.
  (pdfMake as unknown as { createPdf: (d: unknown) => { download: (f: string) => void } }).createPdf(doc).download(filename);
}
