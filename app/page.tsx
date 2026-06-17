import { redirect } from 'next/navigation';

export default async function HomePage() {
  redirect('/getting-started/pre-requisites');
}
