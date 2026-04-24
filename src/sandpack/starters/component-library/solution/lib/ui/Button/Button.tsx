import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { tokens } from "../tokens";

type Variant = "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantStyles: Record<Variant, CSSProperties> = {
  primary: {
    background: tokens.color.primary,
    color: tokens.color.primaryFg,
    border: "1px solid transparent",
  },
  ghost: {
    background: "transparent",
    color: tokens.color.primary,
    border: "1px solid transparent",
  },
};

export function Button({ variant = "primary", style, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        font: `500 14px/1 ${tokens.font.sans}`,
        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
        borderRadius: tokens.radius.md,
        cursor: "pointer",
        ...variantStyles[variant],
        ...style,
      }}
    />
  );
}
