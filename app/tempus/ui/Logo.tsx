import type { CSSProperties, HTMLAttributes } from "react";

type LogoProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  height?: number;
};

const mask: CSSProperties = {
  WebkitMaskImage: 'url("/tempus/longhorn-beetle.svg")',
  maskImage: 'url("/tempus/longhorn-beetle.svg")',
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

export default function Logo({ height = 48, className = "", style, ...props }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="Långhorning"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ ...mask, width: height * (2 / 3), height, ...style }}
      {...props}
    />
  );
}
