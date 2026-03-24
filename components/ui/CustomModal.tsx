interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}

export default function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "lg",
}: CustomModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "sm:max-w-sm", // 384px
    md: "sm:max-w-md", // 448px
    lg: "sm:max-w-lg", // 512px
    xl: "sm:max-w-xl", // 576px
    "2xl": "sm:max-w-2xl", // 672px
    "3xl": "sm:max-w-3xl", // 768px
    "4xl": "sm:max-w-4xl", // 896px
    "5xl": "sm:max-w-5xl", // 1024px
  };

  return (
    <div className="relative z-10">
      <div className="bg-blue-50/10 backdrop-blur-xs fixed inset-0 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto text-white">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div
            className={`relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl outline -outline-offset-1 outline-white/10 transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full ${maxWidthClasses[maxWidth]} data-closed:sm:translate-y-0 data-closed:sm:scale-95`}
          >
            <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div className="text-lg">{title}</div>
                  <hr />
                  <div className="mt-2 text-white">{children}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
