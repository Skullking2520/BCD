import { useRouter } from "next/router";
import SellGoods from "./SellGoods";
import BuyGoods from "./BuyGoods";

export default function GoodsPage() {
  const { query } = useRouter();
  const { itemId, role } = query;

  if (!itemId || !role) return null;

  return role === "seller" ? (
    <SellGoods itemId={itemId} />
  ) : (
    <BuyGoods itemId={itemId} />
  );
}
