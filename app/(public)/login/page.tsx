"use client";

import { LoginForm } from "./LoginForm";

export default function Login({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return <LoginForm callbackUrl={searchParams.callbackUrl} />;
}
