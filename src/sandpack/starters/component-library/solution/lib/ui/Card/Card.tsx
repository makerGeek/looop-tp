import type { HTMLAttributes } from "react";
import { tokens } from "../tokens";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ style, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      style={{
        background: tokens.color.bg,
        color: tokens.color.fg,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: tokens.radius.lg,
        padding: tokens.space.lg,
        font: `400 14px/1.5 ${tokens.font.sans}`,
        ...style,
      }}
    />
  );
}
