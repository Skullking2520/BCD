import { useState, useRef, useEffect } from "react";

export default function MultiSelect({
  options = [],
  selected = [],
  onChange = () => {},
  placeholder = "Select",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div ref={ref} className="relative inline-block font-mono">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2.5 py-2 border border-gray-500 bg-white cursor-pointer inline-flex items-center"
      >
        <span className="flex-1 text-left">
          {selected.length
            ? options
                .filter((o) => selected.includes(o.value))
                .map((o) => o.label)
                .join(", ")
            : placeholder}
        </span>
        <span className="ml-2 select-none">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="absolute top-full left-0 mt-1 bg-white border border-gray-500 max-h-52 overflow-y-auto z-10 w-[200px]">
          {options.map((opt) => (
            <li
              key={opt.value}
              className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
            >
              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                  className="form-checkbox"
                />
                <span>{opt.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
