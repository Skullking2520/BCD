import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Button from "../../components/Button";
import PriceChart from "../../components/PriceChart";
import OfferChart from "../../components/OfferChart";

export default function BuyGoods() {
  const router = useRouter();
  const { itemId, role } = router.query;
  const loginId = "user123"; // TODO: replace with real session ID

  const [item, setItem] = useState(null);
  const [costHistory, setCostHistory] = useState([]);
  const [sellOffers, setSellOffers] = useState([]);
  const [buyOffers, setBuyOffers] = useState([]);

  const [fastQty, setFastQty] = useState(1);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerQty, setOfferQty] = useState("");

  useEffect(() => {
    if (!itemId) return;

    fetch(`/api/goods/${itemId}`)
      .then((res) => res.json())
      .then((data) => {
        setItem(data);
        setCostHistory(data.data || []);
      });

    fetch(`/api/goods/${itemId}/offers?sell`)
      .then((r) => r.json())
      .then(setSellOffers);
    fetch(`/api/goods/${itemId}/offers?buy`)
      .then((r) => r.json())
      .then(setBuyOffers);
  }, [itemId]);

  const handleFastBuy = async () => {
    let remaining = Number(fastQty);
    if (!remaining) {
      alert("Enter a quantity");
      return;
    }

    const sortedSells = [...sellOffers].sort((a, b) => a.price - b.price);
    const executions = [];
    for (const offer of sortedSells) {
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
      alert("Not enough sell orders to fill your quantity");
      return;
    }

    await fetch(`/api/goods/${itemId}/fast-buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executions, buyerId: loginId }),
    });

    const [newSells, newBuys] = await Promise.all([
      fetch(`/api/goods/${itemId}/offers?sell`).then((r) => r.json()),
      fetch(`/api/goods/${itemId}/offers?buy`).then((r) => r.json()),
    ]);
    setSellOffers(newSells);
    setBuyOffers(newBuys);
  };

  const handleAddToCart = () => {
    alert(`Added ${item.name} x${fastQty} to cart`);
  };

  const handleCreateOffer = async () => {
    if (!offerPrice || !offerQty) {
      alert("Enter price and quantity for your offer");
      return;
    }
    await fetch(`/api/goods/${itemId}/offers/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: Number(offerPrice),
        quantity: Number(offerQty),
        buyerId: loginId,
      }),
    });
    const updated = await fetch(`/api/goods/${itemId}/offers?buy`).then((r) =>
      r.json()
    );
    setBuyOffers(updated);
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

      <section className="bg-[#111] p-5 border border-[#333] mb-5">
        <div className="flex gap-2.5 mb-2.5">
          {[
            "Name",
            "Price",
            "Quantity",
            "Quality",
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
            value={item.name}
            readOnly
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
          <input
            value={item.price}
            readOnly
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
          <input
            value={item.quantity || ""}
            readOnly
            placeholder="—"
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
          <input
            value={item.quality}
            readOnly
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
          <input
            value={item.rarity}
            readOnly
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
          <input
            value={item.phases}
            readOnly
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
          <input
            value={item.category}
            readOnly
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
          <input
            value={item.float}
            readOnly
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black flex-1 min-w-[80px]"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 mb-5">
          <input
            type="number"
            value={fastQty}
            onChange={(e) => setFastQty(e.target.value)}
            min={1}
            placeholder="Qty"
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black w-[80px]"
          />
          <Button type="SMALL" onClick={handleFastBuy} text="Fast Buy" />
          <Button type="SMALL" onClick={handleAddToCart} text="Add to Cart" />

          <input
            placeholder="Price"
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
            className="py-1.5 px-2 text-sm border border-[#888] bg-[#f1f1f1] text-black w-[80px]"
          />
          <input
            placeholder="Qty"
            value={offerQty}
            onChange={(e) => setOfferQty(e.target.value)}
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
