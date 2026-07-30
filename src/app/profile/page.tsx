import { redirect } from 'next/navigation';

// The uploads page was folded into /galleries, which now shows both the
// galleries you own and every photo you've added. Kept as a redirect rather
// than deleted so existing links and bookmarks still land somewhere useful.
export default function ProfilePage() {
  redirect('/galleries');
}
