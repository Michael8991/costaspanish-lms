import { AlertCircle } from "lucide-react";
export default function ErrorMessages() {
  return (
    <div className="w-full flex flex-col items-center justify-center ">
      <div className="bg-red-100 py-2 px-4 rounded-lg border border-red-600 text-red-600 shadow-md">
        <p className="flex items-center justify-center gap-2 text-center">
          <AlertCircle size={16} />
          Es posible que el sistema presente problemas en la subida de recursos.
        </p>
<<<<<<< HEAD
        <p className="text-center">
          Se deshabilitará la subida hasta que se solucione.
        </p>
=======
>>>>>>> main
      </div>
    </div>
  );
}
