/** Transición de página sutil (400 ms) al navegar entre rutas. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
