import Image from "next/image";
import iconoPerro from "@/public/assets/OnProgressPageDog1.png";
import Link from "next/link";

interface OnProgressPageProps {
  locale: string;
  safePlace?: boolean;
}

export const OnProgressPage = ({ locale, safePlace }: OnProgressPageProps) => {
  return (
    <div className="w-full flex items-center justify-center my-10">
      <Image
        src={iconoPerro}
        alt="Icono de un perro esperando a que Michael termine de desarrollar"
        height={400}
        width={450}
      />
      <div className="ms-10 flex flex-col items-center justify-start">
        <p className="text-5xl font-semibold text-red-500">
          Módulo en construcción
        </p>
        <p className="text-md text-center text-gray-500">
          Pronto volveremos con actualizaciones. Mientras tanto vuelve a un
          lugar seguro :)
        </p>
        {!safePlace ? (
          ""
        ) : (
          <Link
            href={`/${locale}/dashboard`}
            className=" mt-4 rounded-lg shadow-sm px-4 py-2 flex items-center justify-center bg-red-400 text-white hover:-translate-y-1 transition-all duration-150 ease-in-out"
          >
            Volver a un lugar seguro
          </Link>
        )}
      </div>
    </div>
  );
};
