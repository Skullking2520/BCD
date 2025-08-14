const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameItemERC721", function () {
  let gameRegistry;
  let gameItemERC721;
  let marketplace;
  let owner, gameAdmin, user1, user2;

  beforeEach(async function () {
    [owner, gameAdmin, user1, user2] = await ethers.getSigners();

    // Deploy GameRegistry
    const GameRegistry = await ethers.getContractFactory("GameRegistry");
    gameRegistry = await GameRegistry.deploy();
    await gameRegistry.deployed();

    // Deploy GameItemERC721
    const GameItemERC721 = await ethers.getContractFactory("GameItemERC721");
    gameItemERC721 = await GameItemERC721.deploy(
      "Game Items",
      "GITM",
      gameRegistry.address
    );
    await gameItemERC721.deployed();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(gameRegistry.address, 250); // 2.5% fee
    await marketplace.deployed();

    // Register a game
    await gameRegistry.connect(gameAdmin).registerGame(
      "Test Game",
      "Test Developer",
      "A test game",
      "https://example.com/logo.png",
      gameItemERC721.address
    );

    // Grant MINTER_ROLE to gameAdmin
    const MINTER_ROLE = await gameItemERC721.MINTER_ROLE();
    await gameItemERC721.grantRole(MINTER_ROLE, gameAdmin.address);
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await gameItemERC721.name()).to.equal("Game Items");
      expect(await gameItemERC721.symbol()).to.equal("GITM");
    });

    it("Should set the right game registry", async function () {
      expect(await gameItemERC721.gameRegistry()).to.equal(gameRegistry.address);
    });

    it("Should grant DEFAULT_ADMIN_ROLE to owner", async function () {
      const DEFAULT_ADMIN_ROLE = await gameItemERC721.DEFAULT_ADMIN_ROLE();
      expect(await gameItemERC721.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint a new item", async function () {
      const tx = await gameItemERC721.connect(gameAdmin).mintItem(
        user1.address,
        1, // gameId
        "Sword",
        "legendary",
        10,
        '{"attack": 100, "durability": 50}',
        "https://example.com/sword.json"
      );

      await expect(tx)
        .to.emit(gameItemERC721, "ItemMinted")
        .withArgs(0, 1, user1.address, "Sword", "legendary");

      expect(await gameItemERC721.ownerOf(0)).to.equal(user1.address);
      expect(await gameItemERC721.balanceOf(user1.address)).to.equal(1);
    });

    it("Should fail if not minter", async function () {
      await expect(
        gameItemERC721.connect(user1).mintItem(
          user1.address,
          1,
          "Sword",
          "legendary",
          10,
          '{"attack": 100}',
          "https://example.com/sword.json"
        )
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should batch mint items", async function () {
      const recipients = [user1.address, user2.address];
      const itemTypes = ["Sword", "Shield"];
      const rarities = ["legendary", "epic"];
      const levels = [10, 8];
      const attributes = ['{"attack": 100}', '{"defense": 80}'];
      const tokenURIs = ["https://example.com/sword.json", "https://example.com/shield.json"];

      const tx = await gameItemERC721.connect(gameAdmin).batchMintItems(
        recipients,
        1, // gameId
        itemTypes,
        rarities,
        levels,
        attributes,
        tokenURIs
      );

      // Check that both items were minted
      expect(await gameItemERC721.balanceOf(user1.address)).to.equal(1);
      expect(await gameItemERC721.balanceOf(user2.address)).to.equal(1);
      expect(await gameItemERC721.ownerOf(0)).to.equal(user1.address);
      expect(await gameItemERC721.ownerOf(1)).to.equal(user2.address);
    });
  });

  describe("Metadata", function () {
    beforeEach(async function () {
      // Mint a test item
      await gameItemERC721.connect(gameAdmin).mintItem(
        user1.address,
        1,
        "Sword",
        "legendary",
        10,
        '{"attack": 100, "durability": 50}',
        "https://example.com/sword.json"
      );
    });

    it("Should return correct item metadata", async function () {
      const metadata = await gameItemERC721.getItemMetadata(0);
      expect(metadata.gameId).to.equal(1);
      expect(metadata.itemType).to.equal("Sword");
      expect(metadata.rarity).to.equal("legendary");
      expect(metadata.level).to.equal(10);
      expect(metadata.attributes).to.equal('{"attack": 100, "durability": 50}');
      expect(metadata.originalOwner).to.equal(user1.address);
    });

    it("Should update metadata by game admin", async function () {
      // Add game admin for gameId 1
      await gameItemERC721.addGameAdmin(1, gameAdmin.address);

      await gameItemERC721.connect(gameAdmin).updateMetadata(
        0,
        15, // new level
        '{"attack": 120, "durability": 60}' // new attributes
      );

      const metadata = await gameItemERC721.getItemMetadata(0);
      expect(metadata.level).to.equal(15);
      expect(metadata.attributes).to.equal('{"attack": 120, "durability": 60}');
    });

    it("Should fail to update metadata if not authorized", async function () {
      await expect(
        gameItemERC721.connect(user2).updateMetadata(
          0,
          15,
          '{"attack": 120}'
        )
      ).to.be.revertedWith("Not authorized to update");
    });
  });

  describe("Game Administration", function () {
    it("Should add game admin", async function () {
      await gameItemERC721.addGameAdmin(1, gameAdmin.address);
      expect(await gameItemERC721.isGameAdmin(1, gameAdmin.address)).to.be.true;
    });

    it("Should remove game admin", async function () {
      await gameItemERC721.addGameAdmin(1, gameAdmin.address);
      await gameItemERC721.removeGameAdmin(1, gameAdmin.address);
      expect(await gameItemERC721.isGameAdmin(1, gameAdmin.address)).to.be.false;
    });

    it("Should fail to add game admin if not contract admin", async function () {
      await expect(
        gameItemERC721.connect(user1).addGameAdmin(1, gameAdmin.address)
      ).to.be.revertedWith("AccessControl:");
    });
  });

  describe("Token Tracking", function () {
    beforeEach(async function () {
      // Mint some test items
      await gameItemERC721.connect(gameAdmin).mintItem(
        user1.address, 1, "Sword", "legendary", 10, '{"attack": 100}', "uri1"
      );
      await gameItemERC721.connect(gameAdmin).mintItem(
        user2.address, 1, "Shield", "epic", 8, '{"defense": 80}', "uri2"
      );
      await gameItemERC721.connect(gameAdmin).mintItem(
        user1.address, 2, "Bow", "rare", 5, '{"range": 50}', "uri3"
      );
    });

    it("Should track tokens by game", async function () {
      const game1Tokens = await gameItemERC721.getGameTokens(1);
      expect(game1Tokens.length).to.equal(2);
      expect(game1Tokens[0]).to.equal(0);
      expect(game1Tokens[1]).to.equal(1);

      const game2Tokens = await gameItemERC721.getGameTokens(2);
      expect(game2Tokens.length).to.equal(1);
      expect(game2Tokens[0]).to.equal(2);
    });

    it("Should track tokens by owner", async function () {
      const user1Tokens = await gameItemERC721.getOwnerTokens(user1.address);
      expect(user1Tokens.length).to.equal(2);
      expect(user1Tokens).to.include(0);
      expect(user1Tokens).to.include(2);

      const user2Tokens = await gameItemERC721.getOwnerTokens(user2.address);
      expect(user2Tokens.length).to.equal(1);
      expect(user2Tokens[0]).to.equal(1);
    });

    it("Should update owner tokens on transfer", async function () {
      // Transfer token 0 from user1 to user2
      await gameItemERC721.connect(user1).transferFrom(user1.address, user2.address, 0);

      const user1Tokens = await gameItemERC721.getOwnerTokens(user1.address);
      const user2Tokens = await gameItemERC721.getOwnerTokens(user2.address);

      expect(user1Tokens.length).to.equal(1);
      expect(user1Tokens[0]).to.equal(2);

      expect(user2Tokens.length).to.equal(2);
      expect(user2Tokens).to.include(0);
      expect(user2Tokens).to.include(1);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await gameItemERC721.connect(gameAdmin).mintItem(
        user1.address, 1, "Sword", "legendary", 10, '{"attack": 100}', "uri1"
      );
    });

    it("Should burn item by owner", async function () {
      await expect(gameItemERC721.connect(user1).burnItem(0))
        .to.emit(gameItemERC721, "ItemBurned")
        .withArgs(0);

      await expect(gameItemERC721.ownerOf(0)).to.be.revertedWith("ERC721: invalid token ID");
      expect(await gameItemERC721.balanceOf(user1.address)).to.equal(0);
    });

    it("Should fail to burn if not owner or approved", async function () {
      await expect(
        gameItemERC721.connect(user2).burnItem(0)
      ).to.be.revertedWith("Not authorized to burn");
    });

    it("Should remove from tracking arrays when burned", async function () {
      await gameItemERC721.connect(user1).burnItem(0);
      
      const gameTokens = await gameItemERC721.getGameTokens(1);
      const ownerTokens = await gameItemERC721.getOwnerTokens(user1.address);
      
      expect(gameTokens.length).to.equal(0);
      expect(ownerTokens.length).to.equal(0);
    });
  });

  describe("Integration with Marketplace", function () {
    beforeEach(async function () {
      await gameItemERC721.connect(gameAdmin).mintItem(
        user1.address, 1, "Sword", "legendary", 10, '{"attack": 100}', "uri1"
      );
      
      // Approve marketplace to handle the token
      await gameItemERC721.connect(user1).approve(marketplace.address, 0);
    });

    it("Should allow marketplace to transfer tokens", async function () {
      // Marketplace should be able to transfer the approved token
      await marketplace.connect(user1).createListing(
        gameItemERC721.address,
        0,
        ethers.utils.parseEther("1.0"),
        3600 // 1 hour
      );

      // The listing should be created successfully (tested in marketplace tests)
    });
  });
}); 