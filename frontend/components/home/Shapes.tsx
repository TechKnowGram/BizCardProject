import { useId } from 'react';

// Decorative shapes drawn on a 100 x 100 canvas, centred on 50,50.

export type ShapeKind = 'burst' | 'flower' | 'blob' | 'oval';

type ShapeOptions = { kind: ShapeKind; points?: number; inner?: number; amp?: number };

function toPath(points: [number, number][]) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + 'Z';
}

export function shapePath({ kind, points = 12, inner = 0.7, amp = 0.16 }: ShapeOptions) {
  const out: [number, number][] = [];

  if (kind === 'burst') {
    // Sharp starburst: alternate between the outer and inner radius.
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = (i % 2 === 0 ? 1 : inner) * 49;
      out.push([50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius]);
    }
    return toPath(out);
  }

  // Smooth shapes: the radius wobbles with the angle, which gives petals or a blob.
  const steps = 160;
  const wobble = kind === 'oval' ? 2 : kind === 'blob' ? 3 : points;
  const size = kind === 'oval' ? 0.12 : amp;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const radius = (1 - size + size * Math.cos(wobble * angle)) * 49;
    out.push([50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius]);
  }
  return toPath(out);
}

type ShapeProps = ShapeOptions & {
  fill?: string;
  stroke?: string;
  className?: string;
};

export function Shape({ fill = 'currentColor', stroke, className, ...options }: ShapeProps) {
  return (
    <svg data-g="shape" viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d={shapePath(options)} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.2 : 0} strokeLinejoin="round" />
    </svg>
  );
}

// Thin lines that fan out from a centre, like a sun.
export function Rays({ count = 14, className, color = 'currentColor', width = 2.4 }: { count?: number; className?: string; color?: string; width?: number }) {
  const lines = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return { x1: 50 + Math.cos(angle) * 22, y1: 50 + Math.sin(angle) * 22, x2: 50 + Math.cos(angle) * 48, y2: 50 + Math.sin(angle) * 48 };
  });
  return (
    <svg data-g="shape" viewBox="0 0 100 100" className={className} aria-hidden="true">
      {lines.map((l, i) => <line key={i} {...l} stroke={color} strokeWidth={width} strokeLinecap="round" />)}
    </svg>
  );
}

// A photo cut into one of the shapes above.
export function PhotoShape({ src, alt, className, border, ...options }: ShapeOptions & { src: string; alt: string; className?: string; border?: string }) {
  const id = useId().replace(/:/g, '');
  const d = shapePath(options);
  return (
    <svg data-g="shape" viewBox="0 0 100 100" className={className} role="img" aria-label={alt}>
      <defs><clipPath id={id}><path d={d} /></clipPath></defs>
      <image href={src} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
      {border && <path d={d} fill="none" stroke={border} strokeWidth="1.2" strokeLinejoin="round" />}
    </svg>
  );
}

// Unsplash photo, cropped square around the face.
export const photo = (id: string, size = 500) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&w=${size}&h=${size}&q=80`;

export const photos = {
  womanLaughing: '1531123897727-8f129e1688ce',
  manLong: '1500648767791-00dcc994a43e',
  manSmile: '1507003211169-0a1dd7228f2d',
  womanCurly: '1489424731084-a5d8b219a5bb',
  womanBlazer: '1494790108377-be9c29b29330',
  manBeard: '1506794778202-cad84cf45f1d',
  womanSmile: '1438761681033-6461ffad8d80',
  womanBraids: '1531746020798-e6953c6e8e04',
  manGlasses: '1522075469751-3a6694fb2f61',
  womanHat: '1534528741775-53994a69daeb',
};
