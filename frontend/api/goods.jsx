// example goods list API handler

export default function handler(req, res) {
  const mockData = [
    {
      id: "item001",
      image: "img1.png",
      name: "AK-47 Redline",
      price: 35,
      quality: "Factory New",
      rarity: "Rare",
      phases: 3,
      category: "Rifle",
      float: 0.12,
      sellerId: "user123",
      data: [
        { date: "2023-01-01", price: 30 },
        { date: "2023-02-01", price: 32 },
        { date: "2023-03-01", price: 35 },
        { date: "2023-04-01", price: 33 },
        { date: "2023-05-01", price: 36 },
      ],
    },
    {
      id: "item002",
      image: "img2.png",
      name: "AWP Asiimov",
      price: 60,
      quality: "Battle-Scarred",
      rarity: "Legendary",
      phases: 2,
      category: "Sniper",
      float: 0.75,
      sellerId: "user456",
      data: [
        { date: "2023-01-01", price: 55 },
        { date: "2023-02-01", price: 58 },
        { date: "2023-03-01", price: 60 },
        { date: "2023-04-01", price: 57 },
        { date: "2023-05-01", price: 62 },
      ],
    },
  ];

  res.status(200).json(mockData);
}
