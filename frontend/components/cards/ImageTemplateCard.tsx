'use client';

import ProtectedImage from '@/components/ui/ProtectedImage';
import { QrCode } from '@/components/home/CardMock';
import { cx } from '@/components/ui';
import { isAutoBack } from '@/lib/types';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AutoBack, BandOverlay, ImageTemplateDesign, TemplateField } from '@/lib/types';

export interface CardValues {
  name?: string;
  title?: string;
  department?: string;
  phone?: string;
  email?: string;
  website?: string | null;
  address?: string | null;
  company?: string;
  photoPath?: string | null;
  logoPath?: string | null;
}

/** Whose folder a design's pictures live in: a company id (0 = shared) or 'personal' for an employee's own design. */
export type AssetOwner = number | null | 'personal';

export function ownerOf(design: { company_id?: number | null; owner?: string }): AssetOwner {
  return design.owner === 'personal' ? 'personal' : design.company_id ?? 0;
}

export function assetPath(design: { company_id?: number | null; owner?: string }, file: string) {
  // An employee's own design lives in their private folder.
  if (design.owner === 'personal') return `/employee/designs/assets/${file}`;
  return `/templates/image/assets/${design.company_id ?? 0}/${file}`;
}

export function valueFor(field: TemplateField, values: CardValues): string {
  const map: Record<string, string | null | undefined> = {
    name: values.name, title: values.title, department: values.department, phone: values.phone,
    email: values.email, website: values.website, address: values.address, company: values.company,
  };
  return (map[field.role] ?? '').trim();
}

/** Text field drawn the same way the PDF renderer does: same box, colour, weight and alignment. */
/** The card's height as a fraction of its width: 4/7 for 3.5 x 2 in, taller than 1 for a portrait card. */
export const DEFAULT_ASPECT = 4 / 7;

export function FieldText({ field, text, aspect = DEFAULT_ASPECT }: { field: TemplateField; text: string; aspect?: number }) {
  const multi = field.lines > 1 || field.role === 'address';
  return (
    <span
      className="absolute overflow-hidden leading-[1.15]"
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.w * 100}%`,
        minHeight: `${field.h * 100}%`,
        // size is a fraction of card height; the card is `aspect` times as tall as it is wide
        fontSize: `${field.size * aspect * 100}cqw`,
        color: field.color,
        fontWeight: field.bold ? 700 : 400,
        textAlign: field.align,
        whiteSpace: multi ? 'normal' : 'nowrap',
        textOverflow: multi ? undefined : 'ellipsis',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      {text}
    </span>
  );
}

/** The photo URL asking the server for the same face-centred crop the PDF prints in this frame. */
export function framedPhotoPath(photoPath: string, field: TemplateField, aspect: number) {
  const ratio = field.shape === 'circle' ? 1 : field.w / (field.h * aspect);
  return `${photoPath}${photoPath.includes('?') ? '&' : '?'}frame=${ratio.toFixed(3)}`;
}

export function FieldPhoto({ field, name, photoPath, aspect = DEFAULT_ASPECT }: { field: TemplateField; name: string; photoPath?: string | null; aspect?: number }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <span
      className={cx('absolute grid place-items-center overflow-hidden bg-slate-200 font-semibold text-slate-500', field.shape === 'circle' ? 'rounded-full' : 'rounded-[2%]')}
      style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%`, fontSize: `${field.h * 18}cqw`, aspectRatio: field.shape === 'circle' ? '1' : undefined }}
    >
      {photoPath ? <ProtectedImage path={framedPhotoPath(photoPath, field, aspect)} alt={name} className="size-full object-cover" /> : initials}
    </span>
  );
}

export function FieldQr({ field }: { field: TemplateField }) {
  return (
    <span className="absolute rounded-[0.6cqw] bg-white p-[0.8cqw]" style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%` }}>
      <QrCode className="size-full" />
    </span>
  );
}

export function FieldLogo({ field, logoPath }: { field: TemplateField; logoPath?: string | null }) {
  const box = { left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%` };
  if (!logoPath) return <span className="absolute grid place-items-center rounded-[0.6cqw] border border-dashed border-current/40 text-[2.2cqw] opacity-60" style={box}>Logo</span>;
  return <span className="absolute" style={box}><ProtectedImage path={logoPath} alt="Company logo" className="size-full object-contain" /></span>;
}

/** A picture added to the design as a layer: the same on every card. */
export function FieldPicture({ field, owner }: { field: TemplateField; owner: AssetOwner }) {
  if (!field.image) return null;
  return (
    <span className="absolute" style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%` }}>
      <ProtectedImage path={assetPath(owner === 'personal' ? { owner } : { company_id: owner }, field.image)} alt="" className="size-full object-contain" />
    </span>
  );
}

/** The fields of one side drawn over its background, in the same places the PDF uses. */
export function SideFields({ fields, values, aspect = DEFAULT_ASPECT, owner = 0, overlays }: { fields: TemplateField[]; values: CardValues; aspect?: number; owner?: AssetOwner; overlays?: BandOverlay[] }) {
  const one = (field: TemplateField, i: number) => {
    if (field.role === 'photo') return <FieldPhoto key={i} field={field} name={values.name || ''} photoPath={values.photoPath} aspect={aspect} />;
    if (field.role === 'qr') return <FieldQr key={i} field={field} />;
    if (field.role === 'logo') return <FieldLogo key={i} field={field} logoPath={values.logoPath} />;
    if (field.role === 'other') return null;
    if (field.role === 'static_text') return field.text ? <FieldText key={i} field={field} text={field.text} aspect={aspect} /> : null;
    if (field.role === 'static_image') return <FieldPicture key={i} field={field} owner={owner} />;
    const text = valueFor(field, values);
    return text ? <FieldText key={i} field={field} text={text} aspect={aspect} /> : null;
  };
  // Artwork is stacked in bands: a field placed between two bands is drawn after the lower one.
  const done = new Set<number>();
  const out: ReactNode[] = [];
  [...(overlays || [])].sort((a, b) => a.z - b.z).forEach((band, b) => {
    fields.forEach((field, i) => { if (!done.has(i) && field.z === band.z) { done.add(i); out.push(one(field, i)); } });
    if (band.file) out.push(<ProtectedImage key={'band' + b} path={assetPath(owner === 'personal' ? { owner } : { company_id: owner }, band.file)} alt="" className="pointer-events-none absolute inset-0 size-full object-fill" />);
  });
  fields.forEach((field, i) => { if (!done.has(i)) out.push(one(field, i)); });
  return <>{out}</>;
}

/** The automatic back: logo, company name and website on one colour, QR on the right. Mirrors the PDF layout. */
export function AutoBackFace({ back, values }: { back: AutoBack; values: CardValues }) {
  const website = (values.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <div className="absolute inset-0 flex items-center" style={{ background: back.color, color: back.text_color }}>
      <div className={cx('flex flex-col items-center justify-center gap-[1.6cqw] px-[6cqw] text-center', back.show_qr ? 'w-[80%]' : 'w-full')}>
        {values.logoPath && <ProtectedImage path={values.logoPath} alt="" className="h-[16cqw] w-[22cqw] object-contain" />}
        <span className="font-[Helvetica,Arial,sans-serif] text-[5.6cqw] leading-tight font-bold">{values.company || 'Your company'}</span>
        {website && <span className="font-[Helvetica,Arial,sans-serif] text-[2.9cqw] opacity-90">{website}</span>}
      </div>
      {back.show_qr && (
        <span className="absolute top-1/2 right-[7.9cqw] flex w-[19.8cqw] -translate-y-[42%] flex-col items-center gap-[1cqw]">
          <span className="w-full rounded-[0.6cqw] bg-white p-[1.2cqw]"><QrCode className="aspect-square w-full" /></span>
          <span className="text-[1.9cqw] tracking-wide">SCAN TO VERIFY</span>
        </span>
      )}
    </div>
  );
}

/** Preview of a card made from an uploaded design, filled with one person's details. It has the design's own shape. */
export default function ImageTemplateCard({ design, values, side = 'front', className }: { design: ImageTemplateDesign; values: CardValues; side?: 'front' | 'back'; className?: string }) {
  const back = side === 'back' ? design.back : null;
  // The back is the same size as the front; use the front's shape for both.
  const width = design.width || 7;
  const height = design.height || 4;
  const aspect = height / width;
  const portrait = aspect > 1;
  return (
    <div
      className={cx('relative w-full overflow-hidden rounded-md bg-slate-100 shadow-sm [container-type:inline-size]', portrait && 'mx-auto max-w-[18rem]', className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {isAutoBack(back) ? <AutoBackFace back={back} values={values} /> : <>
        <ProtectedImage path={assetPath(design, back ? back.background : design.background)} alt="" className="absolute inset-0 size-full object-fill" />
        <SideFields fields={back ? back.fields : design.fields} values={values} aspect={aspect} owner={ownerOf(design)} overlays={back ? (back as { overlays?: BandOverlay[] }).overlays : design.overlays} />
      </>}
    </div>
  );
}

/**
 * The finished card: front and back together, turned over with a 3D flip like a real card.
 * Without a back it is just the front. Used wherever a generated or uploaded card is previewed.
 */
export function FlipCard({ design, values, className, showControls = true, side, onSideChange }: {
  design: ImageTemplateDesign; values: CardValues; className?: string; showControls?: boolean;
  /** Controlled side (optional). */
  side?: 'front' | 'back'; onSideChange?: (side: 'front' | 'back') => void;
}) {
  const [own, setOwn] = useState<'front' | 'back'>('front');
  const current = design.back ? side ?? own : 'front';
  const flipped = current === 'back';
  const portrait = (design.height || 4) / (design.width || 7) > 1;
  const turn = () => { const next = flipped ? 'front' : 'back'; setOwn(next); onSideChange?.(next); };
  return (
    <div className={cx('w-full', portrait && 'mx-auto max-w-[18rem]', className)}>
      <div className="[perspective:1600px]">
        <div
          className="relative transition-transform duration-[650ms] ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}
        >
          <div className="[backface-visibility:hidden]" aria-hidden={flipped}>
            <ImageTemplateCard design={design} values={values} side="front" className="shadow-md ring-1 ring-black/5" />
          </div>
          {design.back && (
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]" aria-hidden={!flipped}>
              <ImageTemplateCard design={design} values={values} side="back" className="shadow-md ring-1 ring-black/5" />
            </div>
          )}
        </div>
      </div>
      {showControls && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {design.back ? (
            <>
              <span className="text-xs font-medium text-slate-500 tabular-nums">{flipped ? 'Back' : 'Front'}</span>
              <button
                type="button"
                onClick={turn}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-navy-900 shadow-xs transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.66 5.66L4 15.5M4 20v-4.5h4.5" /></svg>
                {flipped ? 'Show front' : 'Flip to back'}
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-500">Printed on one side</span>
          )}
        </div>
      )}
    </div>
  );
}
