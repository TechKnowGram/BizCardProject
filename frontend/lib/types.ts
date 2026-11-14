/** Shapes returned by the FastAPI backend (see backend/app/schemas). Dates are ISO strings. */

export type Role = 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE';
export type CompanyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | (string & {});
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | (string & {});
export type StyleKey = 'classic' | 'modern' | 'minimal';
export type CardFont = 'Helvetica' | 'Times-Roman' | 'Courier';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  company_id: number | null;
  /** Profile picture: when set, `avatar_version` changes with each new picture. */
  has_avatar?: boolean;
  avatar_version?: number;
}

export interface BrandKit {
  background: string;
  text: string;
  accent: string;
  font: CardFont;
}

export interface CompanySummary {
  id: number;
  name: string;
  status: CompanyStatus;
  selected_template_id: number | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  description?: string | null;
  has_logo?: boolean;
  rejection_reason?: string | null;
  brand_kit?: Partial<BrandKit> | null;
}

export interface Company extends CompanySummary {
  has_logo: boolean;
  phone: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  rejection_reason: string | null;
  created_at: string;
  admins: User[];
}

export interface Employee {
  id: number;
  employee_id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  is_active: boolean;
  has_photo: boolean;
  created_at: string;
  status?: string;
}

export interface CardDesign {
  name: string;
  description: string;
  background: string;
  text: string;
  accent: string;
  layout: 'left' | 'center';
  decoration: 'stripe' | 'corner' | 'frame' | 'minimal' | 'star' | 'sun' | 'govt';
  font: CardFont;
  two_sided: boolean;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  style_key: StyleKey | (string & {});
  is_active: boolean;
  company_id?: number | null;
  design?: CardDesign | ImageTemplateDesign | null;
}

export type TemplateFieldRole = 'name' | 'title' | 'department' | 'phone' | 'email' | 'website' | 'address' | 'company' | 'logo' | 'photo' | 'qr' | 'other';

/** One place on an uploaded design; boxes are fractions (0..1) of the card. */
export interface TemplateField {
  role: TemplateFieldRole;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  shape: 'rect' | 'circle';
  lines: number;
  confidence?: number;
  ink?: [number, number, number, number] | null;
}

/** Template made from an uploaded card image (see backend image_templates). */
export interface ImageTemplateDesign {
  kind: 'image';
  background: string;
  source: string;
  company_id: number | null;
  width: number;
  height: number;
  width_pt?: number | null;
  height_pt?: number | null;
  fields: TemplateField[];
  back?: ImageBackSide | null;
  /** Set when the template was made from an Illustrator file: cards can then also be downloaded as .ai. */
  ai?: { file: string; front: number; back: number | null } | null;
}

/** Back made from its own uploaded design (read by the same ML pipeline as the front). */
export interface ImageSide {
  style?: 'image';
  source: string;
  background: string;
  width: number;
  height: number;
  fields: TemplateField[];
}

/** Back drawn automatically from the company profile: logo, name, website and QR on one colour. */
export interface AutoBack {
  style: 'auto';
  color: string;
  text_color: string;
  show_qr: boolean;
}

export type ImageBackSide = ImageSide | AutoBack;

export function isAutoBack(back: ImageBackSide | null | undefined): back is AutoBack {
  return Boolean(back && back.style === 'auto');
}

export interface TemplateAnalysis {
  source: string;
  background: string;
  width: number;
  height: number;
  /** Real size in points when the design came from an Illustrator artboard. */
  width_pt?: number | null;
  height_pt?: number | null;
  fields: TemplateField[];
  warnings: string[];
}

export function isImageDesign(design: unknown): design is ImageTemplateDesign {
  return Boolean(design && typeof design === 'object' && (design as { kind?: string }).kind === 'image');
}

export interface CardItem {
  id: number;
  employee_id: number;
  employee: Employee;
}

export interface CardRequest {
  id: number;
  company_id: number;
  template_id: number;
  status: RequestStatus;
  rejection_reason: string | null;
  created_at: string;
  decided_at: string | null;
  items: CardItem[];
  company: CompanySummary;
  template: Template;
  created_by: User;
}

export interface GeneratedCard {
  id: number;
  employee_id: number;
  file_name: string;
  file_size: number;
  verification_token: string;
  status: string;
  created_at: string;
}

export interface Verification {
  valid: boolean;
  card_status: string;
  employee_name: string;
  employee_id: string;
  designation: string;
  company_name: string;
  issued_at: string;
}

export interface AppNotification {
  id: number;
  kind: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  company_id: number | null;
  details: string | null;
  created_at: string;
}

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  role: Role;
  company_id: number | null;
  company_name: string | null;
}

export interface AdminMembershipRecord {
  id: number;
  company_id: number;
  company_name: string | null;
  user_id: string | null;
  username: string | null;
  official_email: string;
  employee_code: string;
  payer: string;
  status: string;
  match_status: string | null;
  requested_at: string | null;
  decided_at: string | null;
}

export interface AdminPaymentRecord {
  id: number;
  company_id: number | null;
  company_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payer: string;
  status: string;
  created_at: string | null;
}

/** One artboard of an uploaded Illustrator (.ai) file, with a preview to choose from. */
export interface Artboard {
  index: number;
  name: string;
  width_mm: number;
  height_mm: number;
  card_like: boolean;
  /** File name of the preview image, served by /templates/image/assets/{company_id}/{preview}. */
  preview: string;
}

export interface ArtboardList {
  upload_id: string;
  file_name: string;
  artboards: Artboard[];
}

export interface IllustratorAnalysis {
  upload_id: string;
  front_artboard: number;
  back_artboard: number | null;
  front: TemplateAnalysis;
  back: TemplateAnalysis | null;
}

/** One object on an Illustrator artboard. Positions are fractions (0..1) from the top-left. */
export interface LayerObject { id: number; layer: string; x: number; y: number; w: number; h: number }
export interface LayerText extends LayerObject { text: string; size_pt: number; color: string; bold: boolean }
export interface LayerImage extends LayerObject { width_px: number | null; height_px: number | null; thumbnail: string | null }
export interface LayerShape extends LayerObject { kind: string; fill: string | null; stroke: string | null; stroke_width: number }
export interface LayerSummary { name: string; text: number; image: number; shape: number }
/** One row of the layers tree, like Illustrator's Layers panel. Boxes are fractions of the artboard. */
export interface LayerNode {
  id: number;
  kind: 'layer' | 'group' | 'clip' | 'text' | 'image' | 'shape';
  name: string;
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
  count?: number | null;
  shape_kind?: string | null;
  clip_shape?: boolean;
  fill?: string | null;
  stroke?: string | null;
  stroke_width?: number;
  color?: string | null;
  size_pt?: number | null;
  bold?: boolean;
  width_px?: number | null;
  height_px?: number | null;
  thumbnail?: string | null;
  children: LayerNode[];
}

export interface ArtboardLayers {
  artboard: { index: number; width_mm: number; height_mm: number };
  layers: LayerSummary[];
  tree: LayerNode[];
  images: LayerImage[];
  texts: LayerText[];
  shapes: LayerShape[];
  truncated: boolean;
}
