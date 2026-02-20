import React from "react";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Switch = ({ label, className, ...props }: SwitchProps) => {
  return (
    <label className={`flex items-center cursor-pointer gap-3 ${className}`}>
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="peer appearance-none w-7.5 h-5 bg-[#dfe1e4] rounded-[72px] 
                     transition-all duration-200 ease-out cursor-pointer
                     hover:bg-[#c9cbcd]
                     checked:bg-rose-200 checked:hover:bg-rose-400
                     outline-none focus:ring-0"
          {...props}
        />
        <span
          className="absolute left-0.75 top-0.75 w-3.5 h-3.5 bg-white rounded-full 
                     transition-all duration-200 ease-out pointer-events-none
                     peer-checked:left-3.25"
        ></span>
      </div>
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </label>
  );
};
