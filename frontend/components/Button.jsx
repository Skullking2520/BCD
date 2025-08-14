const Button = ({ text, type, onClick }) => {
  const sizeClasses =
    {
      SMALL: "h-[30px] w-[100px] text-[18px]",
      LARGE: "h-[40px] w-[130px] text-[20px]",
    }[type] ?? "";

  return (
    <button
      onClick={onClick}
      className={`
        bg-gray-200 cursor-pointer border-0 rounded-md 
        py-2.5 px-5 whitespace-nowrap
        ${sizeClasses}
      `}
    >
      {text}
    </button>
  );
};

export default Button;
