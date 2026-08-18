'use client';

/**
 * A weather glyph for a WMO code, drawn rather than emoji.
 *
 * Emoji would have been quicker, but they render differently on every OS and
 * can't be recoloured — and on the day strip these sit on both a white chip
 * and a solid blue one, where the icon has to invert to stay legible.
 */

type Sky = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';

export function skyFor(code: number | null): Sky | null {
  if (code == null) return null;
  if (code === 0) return 'sun';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 57) return 'rain';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'storm';
}

/** What this sky is called, for screen readers and the aria-label. */
export const SKY_LABELS: Record<Sky, string> = {
  sun: 'Sunny',
  partly: 'Partly cloudy',
  cloud: 'Cloudy',
  fog: 'Misty',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Storms',
};

/** Colours for a light chip. On the selected chip everything goes white. */
const TINTS: Record<Sky, string> = {
  sun: 'text-amber-500',
  partly: 'text-amber-500',
  cloud: 'text-slate-400',
  fog: 'text-slate-400',
  rain: 'text-sky-500',
  snow: 'text-sky-400',
  storm: 'text-violet-500',
};

const CLOUD = 'M17.5 18.5a4 4 0 000-8 5.5 5.5 0 00-10.6 1.8A3.2 3.2 0 007.2 18.5h10.3z';

function Shape({ sky }: { sky: Sky }) {
  switch (sky) {
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </>
      );
    case 'partly':
      return (
        <>
          <circle cx="8.5" cy="8" r="3.2" />
          <path d="M8.5 2.5v1.6M3.6 8H2M4.9 4.4L3.8 3.3M12.1 4.4l1.1-1.1" />
          <path d={CLOUD} />
        </>
      );
    case 'cloud':
      return <path d={CLOUD} />;
    case 'fog':
      return (
        <>
          <path d={CLOUD} />
          <path d="M5 21.5h5M13 21.5h6" />
        </>
      );
    case 'rain':
      return (
        <>
          <path d={CLOUD} />
          <path d="M9 20.5l-.8 2M13 20.5l-.8 2M17 20.5l-.8 2" />
        </>
      );
    case 'snow':
      return (
        <>
          <path d={CLOUD} />
          <path d="M9 21.5h.01M13 21.5h.01M17 21.5h.01" />
        </>
      );
    case 'storm':
      return (
        <>
          <path d={CLOUD} />
          <path d="M13 20l-2.5 3.5h3L11 27" />
        </>
      );
  }
}

export function WeatherIcon({
  code,
  className,
  inverted,
}: {
  code: number | null;
  className?: string;
  /** On the selected (solid blue) chip, drop the tint and ride the text colour. */
  inverted?: boolean;
}) {
  const sky = skyFor(code);
  if (!sky) return null;
  return (
    <svg
      viewBox="0 0 24 26"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={SKY_LABELS[sky]}
      className={`${className ?? 'h-3.5 w-3.5'} ${inverted ? '' : TINTS[sky]}`}
    >
      <Shape sky={sky} />
    </svg>
  );
}
