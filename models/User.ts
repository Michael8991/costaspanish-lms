import { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: "admin" | "teacher" | "student";
    preferredLanguage: "es" | "en";
    isActive: boolean;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["admin", "teacher", "student",] },
        preferredLanguage: { type: String, enum: ["es", "en"] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const User = models.User || model<IUser>("User", UserSchema);

export default User;