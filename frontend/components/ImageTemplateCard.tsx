'use client';

import ProtectedImage from '@/components/ProtectedImage';
import { QrCode } from '@/components/home/CardMock';
import { cx } from '@/components/ui';
import { isAutoBack } from '@/lib/types';
import type { AutoBack, ImageTemplateDesign, TemplateField } from '@/lib/types';

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

export function assetPath(design: Pick<ImageTemplateDesign, 'company_id'>, file: string) {
  return `/templates/image/assets/${design.company_id}/${file}`;
}

export function valueFor(field: TemplateField, values: CardValues): string {
  const map: Record<string, string | null | undefined> = {
    name: values.name, title: values.title, department: values.department, phone: values.phone,
    email: values.email, website: values.website, address: values.address, company: values.company,
  };
  return (map[field.role] ?? '').trim();
}

/** Text field drawn the same way the PDF renderer does: same box, colour, weight and alignment. */
export function FieldText({ field, text }: { field: TemplateField; text: string }) {
  const multi = field.lines > 1 || field.role === 'address';
  return (
    <span
      className="absolute overflow-hidden leading-[1.15]"
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.w * 100}%`,
        minHeight: `${field.h * 100}%`,
        // size is a fraction of card height; the card is 4/7 as tall as it is wide
        fontSize: `${field.size * (400 / 7)}cqw`,
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

export function FieldPhoto({ field, name, photoPath }: { field: TemplateField; name: string; photoPath?: string | null }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <span
      className={cx('absolute grid place-items-center overflow-hidden bg-slate-200 font-semibold text-slate-500', field.shape === 'circle' ? 'rounded-full' : 'rounded-[2%]')}
      style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%`, fontSize: `${field.h * 18}cqw`, aspectRatio: field.shape === 'circle' ? '1' : undefined }}
    >
      {photoPath ? <ProtectedImage path={photoPath} alt={name} className="size-full object-cover object-top" /> : initials}
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

/** The fields of one side drawn over its background, in the same places the PDF uses. */
export function SideFields({ fields, values }: { fields: TemplateField[]; values: CardValues }) {
  return <>
    {fields.map((field, i) => {
      if (field.role === 'photo') return <FieldPhoto key={i} field={field} name={values.name || ''} photoPath={values.photoPath} />;
      if (field.role === 'qr') return <FieldQr key={i} field={field} />;
      if (field.role === 'logo') return <FieldLogo key={i} field={field} logoPath={values.logoPath} />;
      if (field.role === 'other') return null;
      const text = valueFor(field, values);
      return text ? <FieldText key={i} field={field} text={text} /> : null;
    })}
  </>;
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

/** Preview of a card made from an uploaded design, filled with one person's details. */
export default function ImageTemplateCard({ design, values, side = 'front', className }: { design: ImageTemplateDesign; values: CardValues; side?: 'front' | 'back'; className?: string }) {
  const back = side === 'back' ? design.back : null;
  return (
    <div className={cx('relative aspect-7/4 w-full overflow-hidden rounded-md bg-slate-100 shadow-sm [container-type:inline-size]', className)}>
      {isAutoBack(back) ? <AutoBackFace back={back} values={values} /> : <>
        <ProtectedImage path={assetPath(design, back ? back.background : design.background)} alt="" className="absolute inset-0 size-full object-fill" />
        <SideFields fields={back ? back.fields : design.fields} values={values} />
      </>}
    </div>
  );
}
