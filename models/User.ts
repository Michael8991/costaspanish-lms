import { Schema, model, models } from "mongoose";

export type GoogleIntegration = {
  connected: boolean;
  scope?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  calendarId?: string | null;
  email?: string | null;
  updatedAt?: Date | null;
};

export type UserRole = "admin" | "teacher" | "student";
export type UserLang = "es" | "en";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  preferredLanguage: UserLang;
  isActive: boolean;
  google?: GoogleIntegration;
}

const GoogleSchema = new Schema(
  {
    connected: { type: Boolean, default: false },
    scope: { type: String, default: null },
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    expiresAt: { type: Number, default: null },
    calendarId: { type: String, default: "primary" },
    email: { type: String, default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "teacher", "student"], required: true },
    preferredLanguage: { type: String, enum: ["es", "en"], required: true },
    isActive: { type: Boolean, default: true },

    google: { type: GoogleSchema, default: () => ({ connected: false }) },
  },
  { timestamps: true }
);

const User = models.User || model<IUser>("User", UserSchema);
export default User;