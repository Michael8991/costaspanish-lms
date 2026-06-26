import { getStorage } from "firebase-admin/storage";
import { ensureFirebaseAdmin } from "./admin";

export async function deleteFirebaseFile(storagePath?: string | null) {
    if (!storagePath) return;
    ensureFirebaseAdmin(); 
    //nota: Aplica un patrón de diseño llamado Singleton. En lugar de inicializar Firebase, hace comprobaciones lógicas automaticas.
    //nota: Comprueba el estado, suele mirarlo en admin.apps.length > 0.
    //nota: Si ya existe, no hace nada. Si no existe, coge las variables de entorno como credenciales y ejecuta admin.initializaApp() */

    try {
        await getStorage().bucket().file(storagePath).delete();
    } catch (error) {

        if (error instanceof Error)
            return error.message
        else
            return "unknown error";
        
     }
}

//nota: Bucket es el servicio de almacenamietno en la nube de Google. Los archivos se guardan dentro de buckets. 