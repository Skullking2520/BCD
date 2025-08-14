const hre = require("hardhat");

async function main() {
  console.log("Starting simple deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy SimpleGameRegistry
  console.log("\nDeploying SimpleGameRegistry...");
  const SimpleGameRegistry = await hre.ethers.getContractFactory("SimpleGameRegistry");
  const simpleGameRegistry = await SimpleGameRegistry.deploy();
  await simpleGameRegistry.waitForDeployment();
  console.log("SimpleGameRegistry deployed to:", await simpleGameRegistry.getAddress());

  // Deploy GameMarketplace
  console.log("\nDeploying GameMarketplace...");
  const GameMarketplace = await hre.ethers.getContractFactory("GameMarketplace");
  const gameMarketplace = await GameMarketplace.deploy();
  await gameMarketplace.waitForDeployment();
  console.log("GameMarketplace deployed to:", await gameMarketplace.getAddress());

  // Register a sample game
  console.log("\nRegistering sample game...");
  const tx = await simpleGameRegistry.registerGame(
    "Legend of Valor",
    "Epic Studios",
    "A fantasy MMORPG with epic battles",
    "https://example.com/lov-logo.png",
    deployer.address // Using deployer address as contract address for demo
  );
  await tx.wait();
  console.log("Sample game registered");

  // List some sample items
  console.log("\nListing sample items...");
  const listItem1 = await gameMarketplace.listItem(
    "Legendary Sword",
    "A powerful sword with magical properties",
    hre.ethers.parseEther("0.1"),
    4 // Legendary
  );
  await listItem1.wait();

  const listItem2 = await gameMarketplace.listItem(
    "Epic Shield",
    "A sturdy shield that blocks all damage",
    hre.ethers.parseEther("0.05"),
    3 // Epic
  );
  await listItem2.wait();

  const listItem3 = await gameMarketplace.listItem(
    "Rare Potion",
    "Restores health and mana instantly",
    hre.ethers.parseEther("0.02"),
    2 // Rare
  );
  await listItem3.wait();

  console.log("Sample items listed");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    contracts: {
      SimpleGameRegistry: await simpleGameRegistry.getAddress(),
      GameMarketplace: await gameMarketplace.getAddress()
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Simple deployment completed!");
  console.log("=".repeat(50));
  console.log("Contract Addresses:");
  console.log("=".repeat(50));
  console.log(`SimpleGameRegistry: ${await simpleGameRegistry.getAddress()}`);
  console.log(`GameMarketplace: ${await gameMarketplace.getAddress()}`);
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 