export default function OfferChart({ data = [] }) {
  return (
    <table className="w-full border-collapse font-mono mb-4">
      <thead>
        <tr>
          {["Price", "Quantity", "Seller"].map((header) => (
            <th
              key={header}
              className="border border-[#444] p-2 text-center text-sm text-[#ccc] bg-[#333]"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((o) => (
          <tr key={o.id} className="even:bg-[#1a1a1a] hover:bg-[#2a2a2a]">
            <td className="border border-[#444] p-2 text-center text-sm text-white bg-[#222]">
              {o.price}
            </td>
            <td className="border border-[#444] p-2 text-center text-sm text-white bg-[#222]">
              {o.quantity}
            </td>
            <td className="border border-[#444] p-2 text-center text-sm text-white bg-[#222]">
              {o.sellerId}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
