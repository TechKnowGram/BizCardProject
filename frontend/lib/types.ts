/** Shapes returned by the FastAPI backend (see backend/app/schemas). Dates are ISO strings. */

export type Role = 'SYSTEM_ADMIN' | 'COMPANY_ADMIN';
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
}

export interface CardDesign {
  name: string;
  description: string;
  background: string;
  text: string;
  accent: string;
  layout: 'left' | 'center';
  decoration: 'stripe' | 'corner' | 'frame' | 'minimal';
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
  design?: CardDesign | null;
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
