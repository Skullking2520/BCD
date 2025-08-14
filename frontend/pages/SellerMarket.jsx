import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Button from "../components/Button";
import GoodsChart from "../components/GoodsChart";
import { sortByColumn } from "../util/sortUtils";

export default function SellerMarket() {
  const router = useRouter();
  const [sortType, setSortType] = useState("name-desc");
  const [originalData, setOriginalData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  // TODO: Replace with actual login ID logic
  const loginId = "user123";

  const columnMap = {
    name: 1,
    price: 2,
    quality: 3,
    rarity: 4,
    phases: 5,
    category: 6,
    float: 7,
  };

  const onClickSwitch = () => {
    router.push("/BuyerMarket");
  };

  const onClickNew = () => {
    router.push("/sell/new");
  };

  const applyFilterAndSort = () => {
    const [key, direction] = sortType.split("-");
    const columnIndex = columnMap[key];
    let filtered = [...originalData];

    if (searchKeyword.trim() !== "") {
      filtered = originalData.filter((row, index) => {
        if (index === 0) return true; // keep header row
        return row
          .slice(1)
          .some((cell) =>
            String(cell).toLowerCase().includes(searchKeyword.toLowerCase())
          );
      });
    }

    if (columnIndex !== undefined) {
      filtered = sortByColumn(filtered, columnIndex, direction);
    }

    setChartData(filtered);
  };

  const onSearch = () => {
    applyFilterAndSort();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      applyFilterAndSort();
    }
  };

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/goods");
      const json = await res.json();
      setOriginalData(json);
      setChartData(json);
    })();
  }, []);

  useEffect(() => {
    applyFilterAndSort();
  }, [sortType]);

  return (
    <div>
      <Header
        button={
          <Button onClick={onClickSwitch} type="LARGE" text="Switch to Buyer" />
        }
      />

      <section className="flex flex-wrap items-center gap-3 py-[15px] px-[30px] bg-black">
        <button
          onClick={onClickNew}
          className="px-4 py-2 font-mono font-bold border border-[#888] bg-[#ccc] cursor-pointer"
        >
          Create Offer
        </button>

        <input
          type="text"
          placeholder="Search..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-2.5 py-2 font-mono text-sm w-[180px] border border-[#888] bg-white"
        />

        <button
          onClick={onSearch}
          className="px-4 py-2 font-mono font-bold border border-[#888] bg-[#ccc] cursor-pointer"
        >
          Search
        </button>

        <label htmlFor="sortSelect" className="font-mono text-sm text-white">
          Sort by:
        </label>
        <select
          id="sortSelect"
          onChange={(e) => setSortType(e.target.value)}
          value={sortType}
          className="px-2.5 py-2 font-mono text-sm border border-[#888] bg-[#f8f8f8]"
        >
          <option value="name-desc">Name ↓</option>
          <option value="name-asc">Name ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="price-asc">Price ↑</option>
          <option value="quality-desc">Quality ↓</option>
          <option value="quality-asc">Quality ↑</option>
          <option value="rarity-desc">Rarity ↓</option>
          <option value="rarity-asc">Rarity ↑</option>
          <option value="phases-desc">Phases ↓</option>
          <option value="phases-asc">Phases ↑</option>
          <option value="category-desc">Category ↓</option>
          <option value="category-asc">Category ↑</option>
          <option value="float-desc">Float ↓</option>
          <option value="float-asc">Float ↑</option>
        </select>
      </section>

      <GoodsChart data={chartData} context="seller" loginId={loginId} />

      {chartData.length <= 1 && (
        <div className="text-center font-mono text-red-500 mt-5">
          No results
        </div>
      )}
    </div>
  );
}
