import type { JSX, SVGProps } from "react";

type BottleIconProps = SVGProps<SVGSVGElement>;
export type BottleVariant = "square" | "round" | "tall";
type BottleIconComponent = (props: BottleIconProps) => JSX.Element;

export function BottleSquareIcon(props: BottleIconProps) {
  return (
    <svg viewBox="0 0 160 200" fill="none" aria-hidden="true" {...props}>
      <path d="M66 20h28v18H66zM61 38h38v13l14 14v94a12 12 0 0 1-12 12H59a12 12 0 0 1-12-12V65l14-14V38Z" />
      <path d="M47 81h66M54 111h52v39H54zM68 20v18m24-18v18" />
      <path d="M62 65h36M60 100h40" className="bottle-detail" />
    </svg>
  );
}

export function BottleRoundIcon(props: BottleIconProps) {
  return (
    <svg viewBox="0 0 160 200" fill="none" aria-hidden="true" {...props}>
      <path d="M67 20h26v18H67zM62 38h36v14l9 12c12 16 19 36 19 57v27a12 12 0 0 1-12 12H46a12 12 0 0 1-12-12v-27c0-21 7-41 19-57l9-12V38Z" />
      <path d="M53 88c15 8 39 8 54 0M45 124h70M67 20v18m26-18v18" />
      <circle cx="80" cy="107" r="13" className="bottle-detail" />
    </svg>
  );
}

export function BottleTallIcon(props: BottleIconProps) {
  return (
    <svg viewBox="0 0 160 200" fill="none" aria-hidden="true" {...props}>
      <path d="M70 18h20v19H70zM65 37h30v14l10 12v99a11 11 0 0 1-11 11H66a11 11 0 0 1-11-11V63l10-12V37Z" />
      <path d="M55 77h50M61 93h38v49H61zM70 18v19m20-19v19" />
      <path d="M67 151h26M68 84h24" className="bottle-detail" />
    </svg>
  );
}

const bottleIcons: Record<BottleVariant, BottleIconComponent> = {
  square: BottleSquareIcon,
  round: BottleRoundIcon,
  tall: BottleTallIcon,
};

export function PerfumeBottle({
  variant,
  className,
}: {
  variant: BottleVariant;
  className: string;
}) {
  const BottleIcon = bottleIcons[variant];
  return <BottleIcon className={className} />;
}
