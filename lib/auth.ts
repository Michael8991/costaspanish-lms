import dbConnect from "./mongo";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        const stagingDiagnosticEnabled = process.env.APP_ENV === "staging";
        const credentialsPresent =
          typeof email === "string" && typeof password === "string";
        let credentialsNonBlank = false;
        let emailMatchesDemo = false;
        let passwordMatchesConfiguredDemoPassword = false;
        let connectedDb: string | null = null;
        let userFound = false;
        let isActive: boolean | null = null;
        let role: string | null = null;
        let hasPasswordHash = false;
        let passwordMatches: boolean | null = null;

        const logStagingDiagnostic = (
          result:
            | "missing_credentials"
            | "blank_credentials"
            | "user_not_found"
            | "inactive_user"
            | "password_hash_missing"
            | "password_mismatch"
            | "authorize_success"
            | "authorize_exception",
          exceptionAt: "db_connect" | "user_lookup" | "password_compare" | null = null,
        ) => {
          if (stagingDiagnosticEnabled) {
            console.info("[staging-auth-diagnostic]", {
              appEnv: process.env.APP_ENV,
              configuredDb: process.env.MONGODB_DB_NAME ?? null,
              connectedDb,
              mongoUriSource:
                process.env.MONGODB_URI !== undefined
                  ? "MONGODB_URI"
                  : process.env.MONGO_URI !== undefined
                    ? "MONGO_URI"
                    : null,
              firebaseProjectLooksStaging: Boolean(
                process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.includes("staging"),
              ),
              demoModeEnabled: process.env.DEMO_MODE === "true",
              credentialsPresent,
              credentialsNonBlank,
              emailMatchesDemo,
              passwordMatchesConfiguredDemoPassword,
              userFound,
              isActive,
              role,
              hasPasswordHash,
              passwordMatches,
              authorizeSucceeded: result === "authorize_success",
              result,
              exceptionAt,
            });
          }
        };

        if (!credentialsPresent) {
          logStagingDiagnostic("missing_credentials");
          return null;
        }

        credentialsNonBlank =
          email.trim().length > 0 && password.trim().length > 0;
        if (!credentialsNonBlank) {
          logStagingDiagnostic("blank_credentials");
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const configuredDemoEmail = process.env.DEMO_TEACHER_EMAIL;
        emailMatchesDemo = Boolean(
          configuredDemoEmail &&
            normalizedEmail === configuredDemoEmail.trim().toLowerCase(),
        );
        passwordMatchesConfiguredDemoPassword = Boolean(
          process.env.DEMO_TEACHER_PASSWORD &&
            password === process.env.DEMO_TEACHER_PASSWORD,
        );

        let currentStep: "db_connect" | "user_lookup" | "password_compare" =
          "db_connect";

        try {
          const mongoose = await dbConnect();
          connectedDb = mongoose.connection.db?.databaseName ?? null;

          currentStep = "user_lookup";
          const user = await User.findOne({ email: normalizedEmail });
          userFound = Boolean(user);
          isActive = user?.isActive ?? null;
          role = user?.role ?? null;
          hasPasswordHash = Boolean(user?.passwordHash);

          if (!user) {
            logStagingDiagnostic("user_not_found");
            return null;
          }
          if (!user.isActive) {
            logStagingDiagnostic("inactive_user");
            return null;
          }
          if (!user.passwordHash) {
            logStagingDiagnostic("password_hash_missing");
            return null;
          }

          currentStep = "password_compare";
          passwordMatches = await bcrypt.compare(password, user.passwordHash);
          if (!passwordMatches) {
            logStagingDiagnostic("password_mismatch");
            return null;
          }

          logStagingDiagnostic("authorize_success");
          return {
            id: user._id.toString(),
            name: user.name ?? "",
            email: user.email,
            role: user.role,
            preferredLanguage: user.preferredLanguage ?? "es",
          };
        } catch (error) {
          logStagingDiagnostic("authorize_exception", currentStep);
          throw error;
        }
      },
    }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //   authorization: {
    //     params: {
    //       scope: [
    //         "openid",
    //         "email",
    //         "profile",
    //         "https://www.googleapis.com/auth/calendar.events",
    //       ].join(" "),
    //       access_type: "offline",
    //       prompt: "consent",
    //     },
    //   },
    // }),
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
  //**Callback para inicio con google */
//  callbacks: {
//   async jwt({ token, user, account }) {
//     // Credentials login
//     if (user) {
//       token.uid = user.id;
//       token.role = user.role;
//       token.preferredLanguage = user.preferredLanguage;
//       token.name = user.name ?? token.name;
//       token.email = user.email ?? token.email;
//     }

//     // Google connect
//     if (account?.provider === "google") {
//       token.googleConnected = true;
//       token.googleExpiresAt = account.expires_at
//         ? account.expires_at * 1000
//         : undefined;

//       if (token.uid) {
//         await dbConnect();

//         const update: Record<string, unknown> = {
//           "google.connected": true,
//           "google.email": token.email,
//           "google.scope": account.scope,
//           "google.expiresAt": account.expires_at
//             ? account.expires_at * 1000
//             : undefined,
//           "google.updatedAt": new Date(),
//         };

//         if (account.access_token) {
//           update["google.accessToken"] = account.access_token;
//         }

//         if (account.refresh_token) {
//           update["google.refreshToken"] = account.refresh_token;
//         }

//         await User.updateOne({ _id: token.uid }, { $set: update });
//       }
//     }

//     return token;
//   },

//   async session({ session, token }) {
//     if (session.user) {
//       session.user.id = token.uid;
//       session.user.role = token.role;
//       session.user.preferredLanguage = token.preferredLanguage;
//     }

//     session.googleConnected = Boolean(token.googleConnected);

//     return session;
//   },
// },
//   pages: {
//     signIn: "/login",
//   },
};
