import dbConnect from "./mongo";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import type { NextAuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";


export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    providers: [ 
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const email = credentials?.email;
                const password = credentials?.password;

                if (typeof email !== "string" || typeof password !== "string") return null;
                if (email.trim().length === 0 || password.trim().length === 0) return null;

                await dbConnect();

                const user = await User.findOne({ email: email.toLowerCase().trim() })
                if (!user) return null;

                const ok = await bcrypt.compare(password, user.passwordHash);
                if (!ok) return null;

              return {
                id: user._id.toString(),
                name: user.name ?? "",
                email: user.email,
                role: user.role,
                preferredLanguage: user.preferredLanguage ?? "es",
              };
            },
        }),
    ],
     callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.preferredLanguage = user.preferredLanguage;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.preferredLanguage = token.preferredLanguage;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
