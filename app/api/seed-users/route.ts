import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongo";
import mongoose from "mongoose";

// Definimos el modelo de User rápidamente aquí para el seed
// (Si ya lo tienes en un archivo separado, puedes importarlo en lugar de esto)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
  preferredLanguage: String,
  isActive: Boolean,
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export async function GET() {
  try {
    await dbConnect();

    // 1. Contraseña por defecto para ambos (luego la podréis cambiar)
    const defaultPassword = "CostaSpanish2026!";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // 2. Datos del Admin (Tú)
    const adminEmail = "michael2002982@gmail.com";
    let admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      admin = await User.create({
        name: "Michael",
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "admin",
        preferredLanguage: "es",
        isActive: true,
      });
    }

    // 3. Datos de la Teacher (María)
    const teacherEmail = "mariagodoynarvaez@gmail.com";
    let teacher = await User.findOne({ email: teacherEmail });

    if (!teacher) {
      teacher = await User.create({
        name: "María Godoy",
        email: teacherEmail,
        passwordHash: hashedPassword,
        role: "teacher",
        preferredLanguage: "es",
        isActive: true,
      });
    }

    return NextResponse.json({ 
      message: "Base de datos poblada con éxito (Seed completado)",
      users: [admin.email, teacher.email]
    });

  } catch (error) {
    console.error("Error en el seed:", error);
    return NextResponse.json({ error: "Hubo un error al crear los usuarios" }, { status: 500 });
  }
}