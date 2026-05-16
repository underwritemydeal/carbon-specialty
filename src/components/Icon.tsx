import type { ReactElement, SVGProps } from "react";

type IconName =
  | "arrow-right"
  | "arrow-down"
  | "building"
  | "shield"
  | "file"
  | "pin"
  | "check"
  | "menu"
  | "search"
  | "mail"
  | "phone"
  | "close";

const PATHS: Record<IconName, ReactElement> = {
  "arrow-right": (
    <>
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14 6 20 12 14 18" />
    </>
  ),
  "arrow-down": (
    <>
      <line x1="12" y1="4" x2="12" y2="20" />
      <polyline points="6 14 12 20 18 14" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" />
      <line x1="9" y1="9" x2="9" y2="9" />
      <line x1="15" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="9" y2="13" />
      <line x1="15" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="9" y2="17" />
      <line x1="15" y1="17" x2="15" y2="17" />
    </>
  ),
  shield: <path d="M12 2 L4 5 V11 C4 16 8 20 12 22 C16 20 20 16 20 11 V5 Z" />,
  file: (
    <>
      <path d="M14 2 H6 V22 H18 V6 Z" />
      <path d="M14 2 V6 H18" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="16" y2="15" />
      <line x1="8" y1="19" x2="13" y2="19" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22 C12 22 19 15 19 10 A7 7 0 0 0 5 10 C5 15 12 22 12 22 Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  check: <polyline points="4 12 10 18 20 6" />,
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="16" y1="16" x2="21" y2="21" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <polyline points="3 7 12 13 21 7" />
    </>
  ),
  phone: (
    <path d="M5 3 H9 L11 8 L8.5 9.5 C9.5 12 12 14.5 14.5 15.5 L16 13 L21 15 V19 A2 2 0 0 1 19 21 A18 18 0 0 1 3 5 A2 2 0 0 1 5 3 Z" />
  ),
  close: (
    <>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </>
  ),
};

type Props = {
  name: IconName;
  size?: number;
  stroke?: number;
} & Omit<SVGProps<SVGSVGElement>, "name" | "stroke">;

export function Icon({ name, size = 20, stroke = 1.5, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
