// pages/goods/[itemId].jsx
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Button from "../../components/Button";
import PriceChart from "../../components/PriceChart";
import OfferChart from "../../components/OfferChart";
import MultiSelect from "../../components/MultiSelect";

export default function SellGoods() {
  const router = useRouter();
  const { itemId, role } = router.query;
  const loginId = "user123"; // TODO: Replace with real login session ID

  const [item, setItem] = useState(null);
  const [costHistory, setCostHistory] = useState([]);
  const [sellOffers, setSellOffers] = useState([]);
  const [buyOffers, setBuyOffers] = useState([]);

  const [fastPrice, setFastPrice] = useState("");
  const [fastQty, setFastQty] = useState(1);

  const [detailPrice, setDetailPrice] = useState("");
  const [detailQty, setDetailQty] = useState("");
  const [raritySel, setRaritySel] = useState([]);
  const [phasesSel, setPhasesSel] = useState([]);
  const [categorySel, setCategorySel] = useState([]);
  const [floatVal, setFloatVal] = useState("");

  const rarityOptions = [
    { value: "ConsumerGrade", label: "Consumer Grade" },
    { value: "IndustrialGrade", label: "Industrial Grade" },
    { value: "MilSpecGrade", label: "Mil-Spec Grade" },
    { value: "Restricted", label: "Restricted" },
    { value: "Classified", label: "Classified" },
    { value: "Covert", label: "Covert" },
    { value: "Contraband", label: "Contraband" },
  ];
  const phasesOptions = [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "Emerald", label: "Emerald" },
    { value: "Sapphire", label: "Sapphire" },
    { value: "Ruby", label: "Ruby" },
    { value: "BlackPearl", label: "Black Pearl" },
  ];
  const categoryOptions = [
    { value: "Common", label: "Common" },
    { value: "StatTrak", label: "StatTrak" },
    { value: "Souvenir", label: "Souvenir" },
    { value: "Star", label: "★" },
    { value: "WithCharms", label: "With any charms" },
    { value: "WithStickers", label: "With any stickers" },
  ];

  useEffect(() => {
    if (!itemId) return;

    fetch(`/api/goods/${itemId}`)
      .then((res) => res.json())
      .then((data) => {
        setItem(data);
        setCostHistory(data.costHistory || []);
        setFastPrice(data.price || "");
      });

    fetch(`/api/goods/${itemId}/offers?sell`)
      .then((res) => res.json())
      .then(setSellOffers);
    fetch(`/api/goods/${itemId}/offers?buy`)
      .then((res) => res.json())
      .then(setBuyOffers);
  }, [itemId]);

  const handleFastSell = async () => {
    if (!fastPrice || !fastQty) {
      alert("Price and Quantity are required");
      return;
    }
    let remaining = Number(fastQty);
    const sortedBuys = [...buyOffers].sort((a, b) => b.price - a.price);
    const executions = [];
    for (const offer of sortedBuys) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, offer.quantity);
      executions.push({
        offerId: offer.id,
        price: offer.price,
        quantity: take,
      });
      remaining -= take;
    }
    if (remaining > 0) {
      alert("Not enough buy-offers to fulfill quantity");
      return;
    }
    await fetch(`/api/goods/${itemId}/fast-sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executions, sellerId: loginId }),
    });
    const [newSells, newBuys] = await Promise.all([
      fetch(`/api/goods/${itemId}/offers?sell`).then((r) => r.json()),
      fetch(`/api/goods/${itemId}/offers?buy`).then((r) => r.json()),
    ]);
    setSellOffers(newSells);
    setBuyOffers(newBuys);
  };

  const handleCreateOffer = async () => {
    if (!detailPrice || !detailQty) {
      alert("Detail price and quantity are required");
      return;
    }
    await fetch(`/api/goods/${itemId}/offers/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: Number(detailPrice),
        quantity: Number(detailQty),
        rarity: raritySel,
        phases: phasesSel,
        category: categorySel,
        float: Number(floatVal),
        sellerId: loginId,
      }),
    });
    const updated = await fetch(`/api/goods/${itemId}/offers?sell`).then((r) =>
      r.json()
    );
    setSellOffers(updated);
  };

  if (!item) return null;

  return (
    <div className="bg-black p-5 text-white font-mono">
      <Header />

      <section className="flex gap-5 mb-5">
        <img
          src={item.image}
          alt={item.name}
          className="w-full max-w-[400px] h-auto object-contain bg-[#ddd] border border-[#444]"
        />
        <PriceChart data={costHistory} />
      </section>

      <section className="flex gap-5 mb-5">
        <OfferChart data={sellOffers} />
        <OfferChart data={buyOffers} />
      </section>

      <section className="bg-[#111] p-5 mb-5 border border-[#333]">
        <div className="flex gap-2.5 mb-2.5">
          {[
            "Name",
            "Price",
            "Quantity",
            "Rarity",
            "Phases",
            "Category",
            "Float",
          ].map((h) => (
            <h4
              key={h}
              className="flex-1 text-center text-sm text-[#ccc] border-b border-[#444] pb-1"
            >
              {h}
            </h4>
          ))}
        </div>

        <div className="flex flex-wrap gap-2.5 mb-5">
          <input
            value={fastPrice}
            onChange={(e) => setFastPrice(e.target.value)}
            placeholder="Fast Sell Price?"
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black w-[80px]"
          />
          <input
            type="number"
            value={fastQty}
            onChange={(e) => setFastQty(e.target.value)}
            placeholder="Quantity?"
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black w-[80px]"
          />
          <Button type="SMALL" onClick={handleFastSell} text="Fast Sell" />

          <input
            value={detailPrice}
            onChange={(e) => setDetailPrice(e.target.value)}
            placeholder="Offer Price?"
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black w-[80px]"
          />
          <input
            value={detailQty}
            onChange={(e) => setDetailQty(e.target.value)}
            placeholder="Quantity?"
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black w-[80px]"
          />
          <MultiSelect
            options={rarityOptions}
            selected={raritySel}
            onChange={setRaritySel}
            placeholder="Select Rarity"
          />
          <MultiSelect
            options={phasesOptions}
            selected={phasesSel}
            onChange={setPhasesSel}
            placeholder="Select Phases"
          />
          <MultiSelect
            options={categoryOptions}
            selected={categorySel}
            onChange={setCategorySel}
            placeholder="Select Category"
          />
          <input
            value={floatVal}
            onChange={(e) => setFloatVal(e.target.value)}
            placeholder="Float?"
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black w-[80px]"
          />
          <Button
            type="SMALL"
            onClick={handleCreateOffer}
            text="Create Offer"
          />
        </div>
      </section>
    </div>
  );
}
