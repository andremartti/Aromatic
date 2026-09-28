import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "./motion";

type Variant = "solid" | "outline" | "ghost";

interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  external?: boolean;
  arrow?: boolean;
  onClick?: () => void;
}

const base =
  "group relative inline-flex min-h-12 items-center justify-center gap-3 overflow-hidden rounded-full px-7 text-[0.8125rem] font-semibold tracking-[0.08em] uppercase transition-[color,background-color,border-color,transform] duration-500 ease-[var(--ease-premium)] active:scale-[0.98]";

const variants: Record<Variant, string> = {
  solid: "bg-charcoal text-ivory hover:bg-ink",
  outline: "border border-charcoal/25 text-charcoal hover:border-charcoal",
  ghost: "text-charcoal px-0 min-h-0",
};

/** Botón/enlace con microinteracción: barrido de luz y flecha que avanza. */
export function Button({ href, children, variant = "solid", className = "", external, arrow = true, onClick }: ButtonProps) {
  const content = (
    <>
      {variant === "solid" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-[var(--ease-premium)] group-hover:translate-x-full"
        />
      )}
      <span className="relative">{children}</span>
      {arrow && (
        <Arrow className="relative w-5 transition-transform duration-500 ease-[var(--ease-premium)] group-hover:translate-x-1" />
      )}
    </>
  );
  const cls = `${base} ${variants[variant]} ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} onClick={onClick}>
      {content}
    </Link>
  );
}
