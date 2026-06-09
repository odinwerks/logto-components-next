import { redirect } from 'next/navigation';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const params = await searchParams;
  const authError = params.auth_error;

  const baseUrl = '/getting-started/pre-requisites';
  const url = authError
    ? `${baseUrl}?auth_error=${encodeURIComponent(authError)}`
    : baseUrl;

  redirect(url);
}
