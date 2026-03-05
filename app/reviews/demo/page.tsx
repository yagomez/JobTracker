import { redirect } from 'next/navigation';

/**
 * Portfolio demo link: /reviews/demo → /reviews?demo=1
 * Use this URL from your portfolio so visitors see the demo with mock data and charts.
 */
export default function ReviewsDemoPage() {
  redirect('/reviews?demo=1');
}
