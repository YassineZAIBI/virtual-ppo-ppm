import { redirect } from 'next/navigation';

// V2: Brain uses single-page navigation with depth-based views.
// Domain sub-pages are no longer used — redirect to /brain.
export default function BrainDomainPage() {
  redirect('/brain');
}
