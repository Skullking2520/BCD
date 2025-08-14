import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { sortByColumn as sortUtil } from "../util/sortUtils";

const GoodsChart = ({ data, context = "buyer", loginId = "" }) => {
  const router = useRouter();
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortedData, setSortedData] = useState([]);

  const headers = [
    { label: "Image", key: "image", sortable: false },
    { label: "Name", key: "name", sortable: true },
    { label: "Price", key: "price", sortable: true },
    { label: "Quality", key: "quality", sortable: true },
    { label: "Rarity", key: "rarity", sortable: true },
    { label: "Phases", key: "phases", sortable: true },
    { label: "Category", key: "category", sortable: true },
    { label: "Float", key: "float", sortable: true },
  ];

  useEffect(() => {
    setSortedData(data);
  }, [data]);

  const handleSort = (key) => {
    const order = sortKey === key && sortOrder === "asc" ? "desc" : "asc";
    const sorted = sortUtil(data, key, order);
    setSortedData(sorted);
    setSortKey(key);
    setSortOrder(order);
  };

  const handleRowClick = (item) => {
    const itemId = item.id;
    const sellerId = item.sellerId;
    const role =
      context === "buyer" ? "buyer" : sellerId === loginId ? "seller" : "buyer";

    router.push({
      pathname: `/goods/${itemId}`,
      query: { role },
    });
  };

  return (
    <table className="border-collapse w-full bg-white">
      <thead>
        <tr>
          {headers.map(({ label, key, sortable }) => (
            <th
              key={key}
              onClick={() => sortable && handleSort(key)}
              className={`
                p-2 border border-black text-center font-mono text-sm
                ${
                  sortable
                    ? "bg-gray-200 hover:bg-gray-300 cursor-pointer"
                    : "bg-gray-50 text-gray-400"
                }
              `}
            >
              {label}
              {sortable &&
                sortKey === key &&
                (sortOrder === "asc" ? " ▲" : " ▼")}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((item, idx) => (
          <tr
            key={idx}
            onClick={() => handleRowClick(item)}
            className="cursor-pointer"
          >
            {headers.map(({ key }) => (
              <td
                key={key}
                className="p-2 border border-black text-center font-mono text-sm"
              >
                {key === "image" ? (
                  <img
                    src={`/${item[key]}`}
                    alt={item.name}
                    className="w-[50px] h-auto mx-auto"
                  />
                ) : (
                  item[key]
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default GoodsChart;
