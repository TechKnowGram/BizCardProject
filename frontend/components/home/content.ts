import type { FaqItem } from './Faq';

export const words = {
  top: ['Classic Cards', 'Modern Cards', 'Minimal Cards', 'QR Verification', 'CSV Import', 'AI Designer', 'Brand Kit', 'Team Orders', 'Print-ready PDFs'],
  bottom: ['New Hires', 'Sales Teams', 'Meet and Greet', 'Conferences', 'Start-ups', 'Agencies', 'Franchises', 'Events', 'Rebrands'],
};

export const faqs: FaqItem[] = [
  { question: 'What is BizCard?', answer: 'BizCard is a workspace where a company manages its people, picks a card design and gets approved, print-ready business cards. Every card carries a QR code anyone can scan to check it is real.' },
  { question: 'Why do I need BizCard?', answer: 'No more emailing files around or chasing a designer. Requests, approvals and downloads all happen in one place.' },
  { question: 'Will I ever have to pay anything?', answer: 'Creating a workspace and adding your team is free. Our team reviews every company before it goes live.' },
  { question: 'How do I add my employees?', answer: 'Type them in one by one, or drop in a CSV file. We check every row and show you what to fix before saving.' },
  { question: 'How do I request cards?', answer: 'Choose a template, select the employees and send the request. An admin reviews it, and once approved the PDFs are ready to download.' },
  { question: 'Can I make my own design?', answer: 'Yes. Describe the look you want and the AI designer suggests a few options, or save your colours and font in the brand kit.' },
  { question: 'How does QR verification work?', answer: 'Scanning a card opens a page showing the name, role, company and whether the card is still valid.' },
  { question: 'How is my data protected?', answer: 'Only your company and our admins can see your employee list. Verification pages show just the details printed on the card.' },
];
