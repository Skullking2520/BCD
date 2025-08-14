// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy GameRegistry
  console.log("\nDeploying GameRegistry...");
  const GameRegistry = await hre.ethers.getContractFactory("GameRegistry");
  const gameRegistry = await GameRegistry.deploy();
  await gameRegistry.deployed();
  console.log("GameRegistry deployed to:", gameRegistry.address);

  // Deploy GameItemERC721
  console.log("\nDeploying GameItemERC721...");
  const GameItemERC721 = await hre.ethers.getContractFactory("GameItemERC721");
  const gameItemERC721 = await GameItemERC721.deploy(
    "Game Items",
    "GITM",
    gameRegistry.address
  );
  await gameItemERC721.deployed();
  console.log("GameItemERC721 deployed to:", gameItemERC721.address);

  // Deploy Marketplace
  console.log("\nDeploying Marketplace...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    gameRegistry.address,
    250 // 2.5% platform fee
  );
  await marketplace.deployed();
  console.log("Marketplace deployed to:", marketplace.address);

  // Register a sample game
  console.log("\nRegistering sample game...");
  const tx = await gameRegistry.registerGame(
    "Legend of Valor",
    "Epic Studios",
    "A fantasy MMORPG with epic battles",
    "https://example.com/lov-logo.png",
    gameItemERC721.address
  );
  await tx.wait();
  console.log("Sample game registered");

  // Grant MINTER_ROLE to deployer for testing
  console.log("\nGranting MINTER_ROLE to deployer...");
  const MINTER_ROLE = await gameItemERC721.MINTER_ROLE();
  await gameItemERC721.grantRole(MINTER_ROLE, deployer.address);
  console.log("MINTER_ROLE granted");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    contracts: {
      GameRegistry: gameRegistry.address,
      GameItemERC721: gameItemERC721.address,
      Marketplace: marketplace.address
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

  console.log("\n✅ Deployment completed!");
  console.log("=".repeat(50));
  console.log("Contract Addresses:");
  console.log("=".repeat(50));
  console.log(`GameRegistry:    ${gameRegistry.address}`);
  console.log(`GameItemERC721:  ${gameItemERC721.address}`);
  console.log(`Marketplace:     ${marketplace.address}`);
  console.log("=".repeat(50));

  // Verify contracts if not on localhost
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nWaiting for block confirmations...");
    await gameRegistry.deployTransaction.wait(5);
    
    console.log("Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: gameRegistry.address,
        constructorArguments: []
      });
      console.log("GameRegistry verified");
    } catch (error) {
      console.error("GameRegistry verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: gameItemERC721.address,
        constructorArguments: ["Game Items", "GITM", gameRegistry.address]
      });
      console.log("GameItemERC721 verified");
    } catch (error) {
      console.error("GameItemERC721 verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: marketplace.address,
        constructorArguments: [gameRegistry.address, 250]
      });
      console.log("Marketplace verified");
    } catch (error) {
      console.error("Marketplace verification failed:", error.message);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 