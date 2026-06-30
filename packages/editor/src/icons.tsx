// Each icon inherits `currentColor` for the stroke, so callers theme via CSS. Icons are
// decorative (`aria-hidden`); the accessible name lives on the parent button/link.

import type { JSX, VNode } from "preact";

interface IconProps {
  size?: number;
  class?: string;
}

function svg(
  size: number,
  cls: string | undefined,
  children: JSX.Element,
  viewBox = "0 0 16 16",
): VNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      stroke-width={1.5}
      stroke-linecap="round"
      stroke-linejoin="round"
      class={cls}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const MenuIcon = ({ size = 17, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M2.5 5h12M2.5 8.5h12M2.5 12h12" />, "0 0 17 17");

export const ChevronDown = ({ size = 12, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M3 5.5L8 10l5-4.5" />);

export const ChevronRight = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M6 3l4 5-4 5" />);

export const ChevronUpSmall = ({ size = 12, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M3 9.5L8 5l5 4.5" />);

// Layout-direction glyphs: bars laid out the way the Frame lays out its children.
export const RowIcon = ({ size = 15, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <rect x="2.5" y="3" width="3.5" height="10" rx="1" />
      <rect x="7.25" y="3" width="3.5" height="10" rx="1" />
      <rect x="12" y="3" width="1.5" height="10" rx="0.75" />
    </g>,
  );

export const ColumnIcon = ({ size = 15, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <rect x="3" y="2.5" width="10" height="3.5" rx="1" />
      <rect x="3" y="7.25" width="10" height="3.5" rx="1" />
      <rect x="3" y="12" width="10" height="1.5" rx="0.75" />
    </g>,
  );

export const GridIcon = ({ size = 15, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <rect x="2.5" y="2.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="2.5" width="5" height="5" rx="1" />
      <rect x="2.5" y="8.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="1" />
    </g>,
  );

export const CheckIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M3 8.5l3.2 3.2L13 4.5" />);

export const PlusIcon = ({ size = 14, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M8 2.5v11M2.5 8h11" />);

export const CloseIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />);

export const SearchIcon = ({ size = 15, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <circle cx="6.8" cy="6.8" r="4.3" />
      <path d="M10 10l3 3" />
    </g>,
  );

export const ArrowUp = ({ size = 14, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M8 12.5V3.5M4.5 7L8 3.5L11.5 7" />);

export const ArrowDown = ({ size = 14, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M8 3.5v9M4.5 9L8 12.5L11.5 9" />);

export const DuplicateIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <rect x="3" y="3" width="7" height="7" rx="1.4" />
      <path d="M6 3V2.4A1 1 0 0 1 7 1.4h5a1 1 0 0 1 1 1V7a1 1 0 0 1-1 1h-.7" />
    </g>,
  );

export const TrashIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <path d="M3 4.5h10M6.3 4.5V3.2h3.4v1.3M4.6 4.5l.5 8h5.8l.5-8" />
    </g>,
  );

export const SettingsIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <path d="M3 5h4M10 5h3M3 11h2M8 11h5" />
      <circle cx="8.5" cy="5" r="1.5" />
      <circle cx="6.5" cy="11" r="1.5" />
    </g>,
  );

export const GripIcon = ({ size = 11, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M5 3h6M5 8h6M5 13h6" />);

export const PageIcon = ({ size = 15, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </g>,
  );

export const SectionIcon = ({ size = 16, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 6.5h6M5 9h4" />
    </g>,
  );

export const ImageIcon = ({ size = 15, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
      <circle cx="6" cy="6.5" r="1.1" />
      <path d="M3 11.5l3-2.5 2.5 2 2-1.5 2.5 2" />
    </g>,
  );

export const UploadIcon = ({ size = 14, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <path d="M8 10.5V3M5 6l3-3 3 3M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />,
  );

export const PublishIcon = ({ size = 14, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M8 11.5V3M5 6l3-3 3 3M3.5 13.5h9" />);

export const BoldIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <path d="M4.5 2.5h4a2.4 2.4 0 0 1 0 5h-4zM4.5 7.5h4.6a2.5 2.5 0 0 1 0 5H4.5z" />,
  );

export const ItalicIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M6.5 2.5h5M3.5 12.5h5M9 2.5L6 12.5" />);

export const LinkIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <g>
      <path d="M6.2 9.8l3.6-3.6M5.4 7.4l-1.2 1.2a2.2 2.2 0 0 0 3.1 3.1l1.2-1.2M10.6 8.6l1.2-1.2a2.2 2.2 0 0 0-3.1-3.1L7.5 5.5" />
    </g>,
  );

export const HeadingIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M3.5 3v10M10.5 3v10M3.5 8h7" />);

export const CodeIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M5.5 4.5L2.5 8l3 3.5M10.5 4.5L13.5 8l-3 3.5" />);

export const BulletListIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M6 4h8M6 8h8M6 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />);

export const NumberedListIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M6 4h8M6 8h8M6 12h8M2 3v2.5M1.4 9.5h1.2L1.4 12h1.4" />);

export const QuoteIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(size, c, <path d="M3 4h3v3.5a2 2 0 0 1-2 2M10 4h3v3.5a2 2 0 0 1-2 2" />);

export const StrikethroughIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <path d="M2.5 8h11M5 5a3 2 0 0 1 3-1.5c1.4 0 2.3.6 2.8 1.4M5.4 11c.5.9 1.5 1.5 2.8 1.5 1.7 0 2.8-.9 2.8-2.1" />,
  );

export const TaskListIcon = ({ size = 13, class: c }: IconProps): VNode =>
  svg(
    size,
    c,
    <path d="M7.5 4.5h6M7.5 11h6M2 4.5l1.3 1.3L5.5 3.5M2.5 10.5h2.5v2.5h-2.5z" />,
  );

export const GitHubIcon = ({ size = 18, class: c }: IconProps): VNode => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    class={c}
    aria-hidden="true"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
