const Header = ({ button }) => {
  return (
    <header className="flex justify-between items-center py-2.5 px-[30px] bg-black">
      <img src="/Logo.png" alt="Logo" className="h-[50px] object-contain" />
      <div>{button}</div>
    </header>
  );
};

export default Header;
