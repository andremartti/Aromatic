"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { money } from "@/lib/shop/money";
import { useAdmin } from "./AdminProvider";
import { addressText, barcodeSvg, downloadGuidesPdf, guideDate, phoneHN, qrPayload, qrSvg, valueText, weightText, type Guide, type GuidesData, type Sender } from "./guides";
import { CopyButton, ErrorNote, PageHead, SkeletonRows, errorMessage, todayStamp, useToast } from "./ui";

export function GuidesView() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <Guides />
    </Suspense>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Guías A4 generadas con los datos guardados del pedido. "Imprimir" y
 * "Descargar PDF" registran la impresión (cuántas veces y quién) en el pedido.
 */
function Guides() {
  const raw = useSearchParams().get("ids") ?? "";
  const ids = useMemo(() => [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => UUID.test(s)))].slice(0, 100), [raw]);
  const { call } = useAdmin();
  const notify = useToast();
  const [data, setData] = useState<GuidesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    let alive = true;
    call<GuidesData>("admin_guides", { order_ids: ids, register_print: false })
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  async function register(): Promise<GuidesData | null> {
    try {
      const d = await call<GuidesData>("admin_guides", { order_ids: ids, register_print: true });
      setData(d);
      return d;
    } catch (err) {
      notify(errorMessage(err), "bad");
      return null;
    }
  }

  async function print() {
    setBusy("print");
    const d = await register();
    setBusy(null);
    // Espera a que React pinte el número de impresión actualizado.
    if (d) requestAnimationFrame(() => setTimeout(() => window.print(), 60));
  }

  async function pdf() {
    setBusy("pdf");
    try {
      const d = await register();
      if (d) await downloadGuidesPdf(d, d.guides.length === 1 ? `guia-${d.guides[0].guideNumber}.pdf` : `guias-${todayStamp()}-${d.guides.length}.pdf`);
    } catch {
      notify("No se pudo generar el PDF. Usa Imprimir → Guardar como PDF.", "bad");
    } finally {
      setBusy(null);
    }
  }

  if (!ids.length) return <ErrorNote message="No hay pedidos seleccionados. Elige pedidos en Envíos o en Pedidos y pulsa “Generar guías”." />;

  const senderMissing = data && (!data.sender.phone || !data.sender.address || !data.sender.city);
  return (
    <>
      <div className="no-print">
        <PageHead
          back={{ href: "/admin/envios/", label: "Envíos" }}
          title={data ? (data.guides.length === 1 ? `Guía ${data.guides[0].guideNumber}` : `${data.guides.length} guías de envío`) : "Guías de envío"}
          meta={<span>A4 · una guía por hoja · sin datos de pago</span>}
        >
          <button type="button" className="admin-btn admin-btn-solid" onClick={print} disabled={!data || busy !== null} aria-busy={busy === "print"}>
            {busy === "print" ? "Preparando…" : data && data.guides.length > 1 ? `Imprimir ${data.guides.length}` : "Imprimir"}
          </button>
          <button type="button" className="admin-btn admin-btn-line" onClick={pdf} disabled={!data || busy !== null} aria-busy={busy === "pdf"}>
            {busy === "pdf" ? "Generando PDF…" : "Descargar PDF"}
          </button>
        </PageHead>
        {senderMissing ? (
          <p className="admin-alert mt-4">
            Faltan datos del remitente (teléfono o dirección de origen). <Link href="/admin/ajustes/?s=envios" className="underline">Complétalos en Ajustes → Envíos</Link>.
          </p>
        ) : null}
        {data?.guides.some((g) => !g.carrier) ? (
          <p className="admin-alert mt-3">Hay guías sin transportista asignada. Puedes asignarla en el pedido o por lote en Envíos.</p>
        ) : null}
      </div>
      {error ? <ErrorNote message={error} /> : null}
      {!data && !error ? <SkeletonRows rows={6} /> : null}
      {data ? (
        <div className="guides-scroll">
          <div className="guides">
            {data.guides.map((g) => <GuideSheet key={g.orderId} g={g} sender={data.sender} />)}
          </div>
        </div>
      ) : null}
    </>
  );
}

function GuideSheet({ g, sender }: { g: Guide; sender: Sender }) {
  const r = g.recipient;
  const [barcode, setBarcode] = useState("");
  const qr = useMemo(() => qrSvg(qrPayload(g)), [g]);
  useEffect(() => {
    barcodeSvg(g.guideNumber).then(setBarcode).catch(() => setBarcode(""));
  }, [g.guideNumber]);

  return (
    <div className="guide-item">
    <article className="guide-sheet" aria-label={`Guía ${g.guideNumber}, pedido ${g.orderNumber}`}>
      {g.isTest ? <span className="guide-test" aria-hidden="true">PRUEBA</span> : null}
      <header className="guide-head">
        <div>
          <p className="guide-brand">Aromatic</p>
          <p className="guide-brand-sub">Home care · Honduras</p>
        </div>
        <div className="guide-id">
          <p className="guide-id-label">Guía de envío</p>
          <p className="guide-id-number">{g.guideNumber}</p>
          {/* SVG generado localmente por JsBarcode a partir del número de guía (sin datos externos). */}
          <div className="guide-barcode" aria-hidden="true" dangerouslySetInnerHTML={{ __html: barcode }} />
        </div>
      </header>

      <section className="guide-parties">
        <div className="guide-party">
          <p className="guide-label">Remitente</p>
          <p className="guide-name">{sender.name}</p>
          <p>{sender.phone ? `Tel. ${sender.phone}` : "Teléfono por definir"}</p>
          <p>{sender.address ?? "Dirección por definir"}</p>
          <p>{[sender.city, sender.department, sender.country].filter(Boolean).join(", ")}</p>
        </div>
        <div className="guide-party guide-recipient">
          <p className="guide-label">Destinatario</p>
          <p className="guide-name">{r.name}</p>
          {r.buyerName && r.buyerName !== r.name ? <p style={{ fontSize: "9pt", color: "#444" }}>Compra: {r.buyerName}</p> : null}
          <p className="guide-phone">Tel. {phoneHN(r.phone)}{r.altPhone ? ` / ${phoneHN(r.altPhone)}` : ""}</p>
          <p className="guide-address">{[r.address, r.neighborhood].filter(Boolean).join(", ")}</p>
          <p className="guide-city">{r.city}, {r.department}</p>
          <p>{r.country}</p>
          {r.reference ? <p style={{ marginTop: "1.5mm" }}><strong>Referencias:</strong> {r.reference}</p> : null}
        </div>
      </section>

      <section className="guide-meta">
        <div><p className="guide-label">Pedido</p><p className="guide-meta-value">{g.orderNumber}</p></div>
        <div><p className="guide-label">Fecha</p><p className="guide-meta-value">{guideDate(g.createdAt)}</p></div>
        <div><p className="guide-label">Transportista</p><p className="guide-meta-value">{g.carrier ?? "Por asignar"}</p></div>
        <div><p className="guide-label">Seguimiento</p><p className="guide-meta-value">{g.tracking ?? "—"}</p></div>
      </section>
      <section className="guide-meta">
        <div><p className="guide-label">Paquetes</p><p className="guide-meta-value">{g.packages}</p></div>
        <div><p className="guide-label">Peso</p><p className="guide-meta-value">{weightText(g)}</p></div>
        <div><p className="guide-label">Valor declarado</p><p className="guide-meta-value">{valueText(g)}</p></div>
        <div><p className="guide-label">Impresión</p><p className="guide-meta-value">{Math.max(1, g.printCount)}</p></div>
      </section>

      <section className="guide-block">
        <p className="guide-label">Contenido</p>
        <p>{g.contents ?? "Productos AROMATIC"}</p>
      </section>
      {r.instructions ? (
        <section className="guide-block">
          <p className="guide-label">Indicaciones de entrega</p>
          <p>{r.instructions}</p>
        </section>
      ) : null}
      {g.handlingNotes ? (
        <section className="guide-block">
          <p className="guide-label">Manejo</p>
          <p><strong>{g.handlingNotes}</strong></p>
        </section>
      ) : null}
      {g.collectOnDelivery !== null ? (
        <p className="guide-cod">Cobrar al entregar: {money(g.collectOnDelivery, g.currency)}</p>
      ) : null}

      <footer className="guide-foot">
        <div className="guide-qr">
          {/* SVG generado localmente (qrcode-generator) con el enlace interno del pedido. */}
          <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="guide-print-meta">Pedido en el panel</p>
        </div>
        <div>
          <p className="guide-label">Recibí conforme</p>
          <div className="guide-sign">
            <div><div className="guide-line" /><p className="guide-line-label">Nombre de quien recibe</p></div>
            <div><div className="guide-line" /><p className="guide-line-label">Identidad</p></div>
            <div><div className="guide-line" /><p className="guide-line-label">Firma</p></div>
            <div><div className="guide-line" /><p className="guide-line-label">Fecha y hora</p></div>
          </div>
        </div>
      </footer>
    </article>
      <div className="no-print mt-3 flex flex-wrap items-center gap-2">
        <CopyButton text={addressText(g)} label="Copiar dirección" done="Dirección copiada" />
        <Link href={`/admin/pedido/?id=${g.orderId}`} className="admin-btn admin-btn-quiet">Abrir pedido {g.orderNumber}</Link>
      </div>
    </div>
  );
}
