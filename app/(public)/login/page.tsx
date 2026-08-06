import { LoginForm } from "./LoginForm";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return <LoginForm callbackUrl={callbackUrl} />;
}
