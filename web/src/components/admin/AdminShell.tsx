"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr/ChartLineUp";
import { Receipt } from "@phosphor-icons/react/dist/ssr/Receipt";
import { Truck } from "@phosphor-icons/react/dist/ssr/Truck";
import { Users } from "@phosphor-icons/react/dist/ssr/Users";
import { Package } from "@phosphor-icons/react/dist/ssr/Package";
import { GearSix } from "@phosphor-icons/react/dist/ssr/GearSix";
import { SignOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { ApiError } from "@/lib/shop/api";
import { useAdmin, type StaffRole } from "./AdminProvider";
import { Switch, ToastProvider } from "./ui";
import { TextField } from "../shop/fields";

const NAV = [
  { href: "/admin/", label: "Resumen", icon: ChartLineUp, match: (p: string) => p === "/admin" || p === "/admin/" },
  { href: "/admin/pedidos/", label: "Pedidos", icon: Receipt, match: (p: string) => p.startsWith("/admin/pedido") },
  { href: "/admin/envios/", label: "Envíos", icon: Truck, match: (p: string) => p.startsWith("/admin/envios") || p.startsWith("/admin/guias") },
  { href: "/admin/clientes/", label: "Clientes", icon: Users, match: (p: string) => p.startsWith("/admin/cliente") },
  { href: "/admin/productos/", label: "Productos", icon: Package, match: (p: string) => p.startsWith("/admin/producto") },
  { href: "/admin/ajustes/", label: "Ajustes", icon: GearSix, match: (p: string) => p.startsWith("/admin/ajustes") },
];

export const ROLE_LABELS: Record<StaffRole, string> = { owner: "Propietario", admin: "Administrador", staff: "Personal" };

/**
 * Puerta del panel: muestra el acceso, la recuperación de contraseña o el
 * panel según la sesión. Ocultar la interfaz no protege nada por sí solo:
 * cada consulta la autoriza el servidor con el rol del usuario.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { state } = useAdmin();

  if (state.kind === "loading") {
    return (
      <AuthFrame>
        <p className="text-small text-warm-gray" role="status">Comprobando la sesión…</p>
      </AuthFrame>
    );
  }
  if (state.kind === "unconfigured") return <Unconfigured />;
  if (state.kind === "signed-out") return <SignIn />;
  if (state.kind === "set-password") return <SetPassword />;
  if (state.kind === "forbidden") return <Forbidden email={state.email} />;
  return (
    <ToastProvider>
      <Layout>{children}</Layout>
    </ToastProvider>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const { me, signOut, showTest, setShowTest } = useAdmin();
  const pathname = usePathname() ?? "/admin/";
  if (!me) return null;
  const nav = (
    <nav aria-label="Secciones del panel" className="admin-nav">
      {NAV.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link key={href} href={href} className="admin-nav-link" aria-current={active ? "page" : undefined}>
            <Icon className="admin-nav-icon" weight={active ? "regular" : "light"} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="admin" data-test={showTest ? "" : undefined}>
      <aside className="admin-side no-print">
        <Link href="/admin/" className="admin-brand">
          <span className="wordmark text-[1.05rem]">Aromatic</span>
          <span className="admin-brand-sub">Panel</span>
        </Link>
        {nav}
        <div className="admin-side-foot">
          <Switch checked={showTest} onChange={setShowTest} label="Datos de prueba" hint="Pedidos hechos en modo de pruebas" />
          <div className="admin-user">
            <p className="admin-user-mail" title={me.email}>{me.fullName || me.email}</p>
            <p className="admin-user-role">{ROLE_LABELS[me.role]}</p>
          </div>
          <div className="flex flex-wrap gap-x-4">
            <Link href="/" className="admin-side-link" target="_blank" rel="noopener">
              Ver tienda <ArrowSquareOut aria-hidden="true" />
            </Link>
            <button type="button" className="admin-side-link" onClick={signOut}>
              Cerrar sesión <SignOut aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-top no-print">
        <div className="admin-top-bar">
          <Link href="/admin/" className="admin-brand">
            <span className="wordmark text-[0.95rem]">Aromatic</span>
            <span className="admin-brand-sub">Panel</span>
          </Link>
          <div className="flex items-center gap-1">
            <Switch checked={showTest} onChange={setShowTest} label="Prueba" />
            <button type="button" className="admin-icon-btn" onClick={signOut} aria-label="Cerrar sesión">
              <SignOut aria-hidden="true" />
            </button>
          </div>
        </div>
        {nav}
      </div>

      <main id="contenido" className="admin-main">
        {showTest ? (
          <p className="admin-test-strip no-print">
            Estás viendo <strong>pedidos de prueba</strong>. No son ventas reales y no cuentan en los reportes.
          </p>
        ) : null}
        {!me.storeEnabled ? (
          <p className="admin-test-strip no-print">
            La tienda está <strong>cerrada</strong>: los clientes ven el catálogo pero no pueden comprar.{" "}
            <Link href="/admin/ajustes/" className="underline">Abrir en Ajustes</Link>
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 *  Pantallas de acceso
 * ------------------------------------------------------------------------- */
function AuthFrame({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <main id="contenido" className="admin-auth">
      <div className="admin-auth-card">
        <p className="wordmark text-[1.15rem]">Aromatic</p>
        <p className="admin-brand-sub mt-1">Panel de la tienda</p>
        {title ? <h1 className="admin-auth-title">{title}</h1> : null}
        {children}
      </div>
    </main>
  );
}

function SignIn() {
  const { signIn, resetPassword } = useAdmin();
  const [mode, setMode] = useState<"login" | "reset" | "sent">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Escribe tu correo.");
    setBusy(true);
    try {
      if (mode === "login") {
        if (!password) return setError("Escribe tu contraseña.");
        await signIn(email, password);
      } else {
        await resetPassword(email);
        setMode("sent");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "sent") {
    return (
      <AuthFrame title="Revisa tu correo">
        <p className="mt-3 text-small text-ink">
          Si <strong>{email}</strong> pertenece al personal, recibirás un enlace para crear una contraseña nueva.
        </p>
        <button type="button" className="admin-btn admin-btn-quiet mt-6" onClick={() => setMode("login")}>Volver al acceso</button>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={mode === "login" ? "Iniciar sesión" : "Recuperar contraseña"}>
      <form className="mt-6 grid gap-5" onSubmit={submit} noValidate>
        <TextField id="admin-email" label="Correo" type="email" autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        {mode === "login" ? (
          <TextField id="admin-password" label="Contraseña" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} />
        ) : (
          <p className="text-small text-warm-gray">Te enviaremos un enlace para crear una contraseña nueva.</p>
        )}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" className="admin-btn admin-btn-solid admin-btn-lg" disabled={busy} aria-busy={busy}>
          {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Enviar enlace"}
        </button>
      </form>
      <button type="button" className="admin-btn admin-btn-quiet mt-4" onClick={() => { setError(null); setMode(mode === "login" ? "reset" : "login"); }}>
        {mode === "login" ? "¿Olvidaste tu contraseña?" : "Volver al acceso"}
      </button>
    </AuthFrame>
  );
}

function SetPassword() {
  const { setPassword } = useAdmin();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return setError("Usa al menos 10 caracteres.");
    if (pw !== pw2) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    setError(null);
    try {
      await setPassword(pw);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Crea tu contraseña">
      <form className="mt-6 grid gap-5" onSubmit={submit} noValidate>
        <TextField id="admin-new-password" label="Contraseña nueva" type="password" autoComplete="new-password" value={pw}
          onChange={(e) => setPw(e.target.value)} hint="Mínimo 10 caracteres. Evita reutilizar contraseñas de otros sitios." />
        <TextField id="admin-new-password-2" label="Repite la contraseña" type="password" autoComplete="new-password" value={pw2}
          onChange={(e) => setPw2(e.target.value)} />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" className="admin-btn admin-btn-solid admin-btn-lg" disabled={busy} aria-busy={busy}>
          {busy ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </AuthFrame>
  );
}

function Forbidden({ email }: { email: string | null }) {
  const { signOut } = useAdmin();
  return (
    <AuthFrame title="Sin acceso al panel">
      <p className="mt-3 text-small text-ink">
        La cuenta {email ? <strong>{email}</strong> : null} no forma parte del personal de la tienda o fue desactivada.
        Pide al propietario que te agregue desde Ajustes → Personal.
      </p>
      <button type="button" className="admin-btn admin-btn-line mt-6" onClick={signOut}>Usar otra cuenta</button>
    </AuthFrame>
  );
}

function Unconfigured() {
  return (
    <AuthFrame title="Panel sin conectar">
      <p className="mt-3 text-small text-ink">
        Este sitio todavía no tiene configurado el servidor de la tienda. Define las variables
        <code className="admin-code">NEXT_PUBLIC_SUPABASE_URL</code> y <code className="admin-code">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en
        el despliegue y vuelve a publicar. Los pasos están en <code className="admin-code">docs/TIENDA.md</code>.
      </p>
    </AuthFrame>
  );
}
