"use client";

import Image from "next/image";
import { Switch } from "@/components/ui/Switch";

import { signIn } from "next-auth/react";
import { useState } from "react";

export const LoginForm = ({ callbackUrl }: { callbackUrl?: string }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const safeCallback =
      typeof callbackUrl === "string" && callbackUrl.startsWith("/")
        ? callbackUrl
        : "/en/dashboard";

    const res = await signIn("credentials", {
      email,
      password,
      remember,
      redirect: false,
      callbackUrl: safeCallback,
    });

    setLoading(false);

    if (!res) {
      setError("Login failed. Please try again.");
      return;
    }

    if (res.error) {
      setError("Invalid Credentials");
      return;
    }

    window.location.href = res.url ?? safeCallback;
  }

  return (
    <div className="bg-gray-50 flex w-full min-h-screen items-center align-middle">
      <div className="login-wrap max-xl:mx-auto w-200 min-h-125 mx-auto shadow-lg rounded-lg bg-white p-2">
        <div className="grid grid-cols-2 xl:grid-cols-12 xl:gap-0 xl:w-full xl:h-full p-5">
          <div className="flex flex-col max-xl:mb-5 px-5 col-span-7 items-center justify-center align-middle">
            <div className="flex justify-center items-center w-full">
              <Image
                src="/assets/LogoCostaSpanishRojoCoralFuerte.png"
                alt="Logo Costa Spanish"
                width={150}
                height={75}
              />
            </div>
            <p className="text-md text-gray-600 text-center">
              Study anywhere, anytime.
            </p>
            <p className="text-md text-gray-600 text-center">
              Your entire learning journey, centralized in one place.
            </p>
            <div className="mt-10">
              <h3 className="text-sm text-rose-500 mb-2">Not a student yet?</h3>
              <p className="text-sm text-gray-400">
                This is our private campus for enrolled learners. If you are
                looking to start your Spanish journey with us, visit our main
                website to explore our courses and join the CostaSpanish family.
              </p>

              <a
                href="https://costaspanish.com"
                target="_blank"
                className="text-sm text-rose-300 hover:text-rose-500 mt-2"
              >
                Visit our website →
              </a>
            </div>
          </div>

          <div className="col-span-5 flex flex-col align-middle justify-center align-center">
            <h1 className="text-4xl font-bold text-rose-500 text-center">
              Welcome
            </h1>
            <p className="text-gray-500 text-sm text-center font-light mt-2">
              Login with email for students
            </p>
            <form onSubmit={onSubmit} className="my-5">
              <div className="input-group mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 py-2 px-3 block w-full rounded-sm border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm"
                  placeholder="example@gmail.com"
                  required
                />
              </div>
              <div className="input-group mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="password"
                  className="mt-1 py-2 px-3 block w-full rounded-sm border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm"
                  placeholder="********"
                  required
                />
              </div>
              <div className="input-group flex">
                <Switch
                  name="saveSession"
                  label="Remember me"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
              </div>
              <div className="w-full text-right">
                <a
                  href="#"
                  className="text-sm text-rose-300 hover:text-rose-500"
                >
                  Forgot your password?
                </a>
              </div>
              {error && (
                <p className="text-sm text-white bg-red-400 my-2 py-2 px-4 w-full rounded-md shadow-sm text-center">
                  {error}
                </p>
              )}
              <div className="flex w-full align-middle justify-center mt-10">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2 px-5 bg-rose-400 rounded-lg text-white shadow-md transition-all duration-300 ease-in-out hover:cursor-pointer hover:scale-105 hover:bg-rose-600 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {loading && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  <span>{loading ? "Loading..." : "Login"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
