import { redirect } from 'next/navigation';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const { auth_error } = await searchParams;
  if (auth_error) {
    redirect(
      `/getting-started/pre-requisites?auth_error=${encodeURIComponent(auth_error)}`
    );
  }
  redirect('/getting-started/pre-requisites');
}
