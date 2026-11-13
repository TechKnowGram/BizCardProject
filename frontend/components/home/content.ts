export type FaqItem = { question: string; answer: string };

export const facts = [
  { value: '3.5 × 2 in', label: 'Standard card size' },
  { value: 'PDF', label: 'Vector, print-ready file' },
  { value: 'CSV', label: 'Bulk staff import' },
  { value: 'QR', label: 'Verification on every card' },
  { value: '2-step', label: 'Request and approval' },
];

export const features = [
  { icon: 'lucide:users', title: 'Staff list', text: 'Add people one by one or import a CSV. Rows with problems are flagged before anything is saved.' },
  { icon: 'lucide:layout-template', title: 'Your own design', text: 'Upload a card made in Photoshop or Canva. Machine learning reads it and marks where every detail goes.' },
  { icon: 'lucide:clipboard-check', title: 'Requests and approval', text: 'Employees ask for a card, an admin checks it. Nothing goes to print without a yes.' },
  { icon: 'lucide:file-down', title: 'Print-ready files', text: 'Approved cards come out as vector PDFs at the standard 3.5 × 2 inch size.' },
];

export const steps = [
  { title: 'Register the company', text: 'Fill in your company details. We check each new company before its workspace opens.' },
  { title: 'Add your people', text: 'Type staff in, or upload a CSV of names, roles, emails and phone numbers.' },
  { title: 'Choose a design', text: 'Pick a template, adjust colours and fonts, and select who needs cards.' },
  { title: 'Approve and download', text: 'Review the request, approve it, and download the PDFs for your printer.' },
];

export const reasons = [
  { icon: 'lucide:shield-check', title: 'Every card can be checked', text: 'Scanning the QR code opens a page that confirms the name, role and company, and whether the card is still active.' },
  { icon: 'lucide:palette', title: 'One look for the whole company', text: 'Save your colours, fonts and logo once. Each new card follows the same brand rules.' },
  { icon: 'lucide:user-x', title: 'Cards stop working when people leave', text: 'Deactivate a card and its QR page shows it is no longer valid. No need to chase down paper.' },
  { icon: 'lucide:lock', title: 'Private details stay private', text: 'Only your company and the platform admins see the staff list. Public pages show what is printed on the card.' },
];

export const templates = [
  { look: 'classic', label: 'Upload your design', note: 'Export the card from Photoshop or Canva. Machine learning finds the name, title, contact details and photo frame.' },
  { look: 'modern', label: 'Add a back if you want one', note: 'Upload the back design too, or let us print your logo, name, website and QR code on a colour you pick.' },
  { look: 'minimal', label: 'Every card filled in for you', note: 'Each employee’s details, photo and QR code go into the right place, ready to print.' },
] as const;

export const roles = [
  {
    title: 'Company admin',
    text: 'Runs the company workspace.',
    points: ['Manage the staff list', 'Set the brand kit', 'Approve card requests', 'Download PDFs'],
  },
  {
    title: 'Employee',
    text: 'Joins their company and asks for a card.',
    points: ['Fill in their own profile', 'Preview the card live', 'Track request status', 'Keep a copy of the PDF'],
  },
  {
    title: 'Platform admin',
    text: 'Keeps the whole service in order.',
    points: ['Review new companies', 'Manage shared templates', 'See the audit log', 'Step in on requests'],
  },
];

export const faqs: FaqItem[] = [
  { question: 'What is BizCard?', answer: 'BizCard is a workspace where a company keeps its staff list, chooses a card design and gets approved, print-ready business cards. Every card has a QR code that anyone can scan to check it is real.' },
  { question: 'How do I add my employees?', answer: 'Add them one at a time, or upload a CSV file. Each row is checked and you see what needs fixing before anything is saved.' },
  { question: 'How do I request cards?', answer: 'Choose a template, select the employees and send the request. An admin reviews it, and once approved the PDFs are ready to download.' },
  { question: 'Can we use our own design?', answer: 'Yes, that is how it works. Upload a finished design and machine learning finds where the name, title, contact details and photo go. The back is optional: upload it too, or use a simple back made from your logo and website. You check everything before saving.' },
  { question: 'How does QR verification work?', answer: 'Scanning a card opens a public page showing the name, role and company printed on it, and whether the card is still active.' },
  { question: 'Who can see our staff data?', answer: 'Only your company admins and the platform admins. Verification pages show just the details that are already printed on the card; emails and phone numbers stay private.' },
];

/*
 * SAMPLE DATA: demo figures and quotes for the homepage.
 * Replace with real numbers and real, approved customer quotes before launch.
 * The sections render whatever is in these two arrays.
 */
export const stats = [
  { value: '120+', label: 'Companies using BizCard' },
  { value: '8,500+', label: 'Cards issued' },
  { value: '1 day', label: 'Typical approval time' },
  { value: '99%', label: 'Cards printed without reprints' },
];

export const testimonials = [
  {
    quote: 'We used to collect card details over email and lose half of them. Now HR updates the staff list and new joiners have cards in their first week.',
    name: 'Sharmin Akter',
    role: 'HR Manager',
    company: 'Northwind Garments',
  },
  {
    quote: 'Every branch prints the same design now. The approval step means nothing goes to the printer with a typo.',
    name: 'Rafiq Islam',
    role: 'Head of Marketing',
    company: 'Meghna Foods',
  },
  {
    quote: 'Clients scan the QR code and see the card is genuine. That matters for our field staff.',
    name: 'Mehedi Hasan',
    role: 'Operations Director',
    company: 'Delta Field Services',
  },
];
