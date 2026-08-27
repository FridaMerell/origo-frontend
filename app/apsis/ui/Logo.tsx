import type { CSSProperties, HTMLAttributes } from "react";

type LogoProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  height?: number;
};

// Natural aspect ratio of apsis_flower.svg is 236:439 (portrait).
const RATIO = 236 / 439;

const mask: CSSProperties = {
  WebkitMaskImage: 'url("/apsis/apsis_flower.svg")',
  maskImage: 'url("/apsis/apsis_flower.svg")',
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
      aria-label="Apsis"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ ...mask, width: height * RATIO, height, ...style }}
      {...props}
    />
  );
}
