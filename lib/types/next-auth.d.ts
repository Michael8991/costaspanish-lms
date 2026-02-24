import { DefaultSession, DefaultUser } from "next-auth";


declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "teacher" | "student";
      preferredLanguage: string;
    } & DefaultSession["user"];

    googleConnected?: boolean;
  }

  interface User extends DefaultUser {
    id: string;
    role: "admin" | "teacher" | "student";
    preferredLanguage: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: "admin" | "teacher" | "student";
    preferredLanguage: string;

    googleConnected?: boolean;
    googleExpiresAt?: number;
  }
}
