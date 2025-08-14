const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameRegistry", function () {
  let gameRegistry;
  let owner;
  let developer1;
  let developer2;

  beforeEach(async function () {
    [owner, developer1, developer2] = await ethers.getSigners();
    
    const GameRegistry = await ethers.getContractFactory("GameRegistry");
    gameRegistry = await GameRegistry.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await gameRegistry.owner()).to.equal(owner.address);
    });

    it("Should start with zero games", async function () {
      expect(await gameRegistry.getGameCount()).to.equal(0);
    });
  });

  describe("Game Registration", function () {
    it("Should register a game successfully", async function () {
      const gameData = {
        name: "Test Game",
        developer: "Test Developer",
        description: "A test game",
        logoUrl: "https://example.com/logo.png",
        contractAddress: developer1.address
      };

      await gameRegistry.registerGame(
        gameData.name,
        gameData.developer,
        gameData.description,
        gameData.logoUrl,
        gameData.contractAddress
      );

      const game = await gameRegistry.getGame(1);
      expect(game.name).to.equal(gameData.name);
      expect(game.developer).to.equal(gameData.developer);
      expect(game.contractAddress).to.equal(gameData.contractAddress);
      expect(game.isVerified).to.equal(false);
      expect(game.isActive).to.equal(true);
    });

    it("Should emit GameRegistered event", async function () {
      const gameData = {
        name: "Test Game",
        developer: "Test Developer",
        description: "A test game",
        logoUrl: "https://example.com/logo.png",
        contractAddress: developer1.address
      };

      await expect(
        gameRegistry.registerGame(
          gameData.name,
          gameData.developer,
          gameData.description,
          gameData.logoUrl,
          gameData.contractAddress
        )
      ).to.emit(gameRegistry, "GameRegistered")
        .withArgs(1, gameData.name, developer1.address, gameData.contractAddress);
    });

    it("Should fail to register game with empty name", async function () {
      await expect(
        gameRegistry.registerGame(
          "",
          "Test Developer",
          "A test game",
          "https://example.com/logo.png",
          developer1.address
        )
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should fail to register game with empty developer", async function () {
      await expect(
        gameRegistry.registerGame(
          "Test Game",
          "",
          "A test game",
          "https://example.com/logo.png",
          developer1.address
        )
      ).to.be.revertedWith("Developer cannot be empty");
    });

    it("Should fail to register game with zero address", async function () {
      await expect(
        gameRegistry.registerGame(
          "Test Game",
          "Test Developer",
          "A test game",
          "https://example.com/logo.png",
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("Invalid contract address");
    });

    it("Should fail to register duplicate contract", async function () {
      const gameData = {
        name: "Test Game",
        developer: "Test Developer",
        description: "A test game",
        logoUrl: "https://example.com/logo.png",
        contractAddress: developer1.address
      };

      await gameRegistry.registerGame(
        gameData.name,
        gameData.developer,
        gameData.description,
        gameData.logoUrl,
        gameData.contractAddress
      );

      await expect(
        gameRegistry.registerGame(
          "Another Game",
          "Another Developer",
          "Another test game",
          "https://example.com/logo2.png",
          gameData.contractAddress
        )
      ).to.be.revertedWith("Contract already registered");
    });
  });

  describe("Game Verification", function () {
    beforeEach(async function () {
      await gameRegistry.registerGame(
        "Test Game",
        "Test Developer",
        "A test game",
        "https://example.com/logo.png",
        developer1.address
      );
    });

    it("Should verify game by owner", async function () {
      await gameRegistry.verifyGame(1);
      
      const game = await gameRegistry.getGame(1);
      expect(game.isVerified).to.equal(true);
    });

    it("Should emit GameVerified event", async function () {
      await expect(gameRegistry.verifyGame(1))
        .to.emit(gameRegistry, "GameVerified")
        .withArgs(1);
    });

    it("Should fail to verify non-existent game", async function () {
      await expect(gameRegistry.verifyGame(999))
        .to.be.revertedWith("Game does not exist");
    });

    it("Should fail to verify game by non-owner", async function () {
      await expect(
        gameRegistry.connect(developer1).verifyGame(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Game Management", function () {
    beforeEach(async function () {
      await gameRegistry.registerGame(
        "Test Game",
        "Test Developer",
        "A test game",
        "https://example.com/logo.png",
        developer1.address
      );
    });

    it("Should update game information", async function () {
      const newData = {
        name: "Updated Game",
        developer: "Updated Developer",
        description: "Updated description",
        logoUrl: "https://example.com/updated-logo.png"
      };

      await gameRegistry.updateGame(
        1,
        newData.name,
        newData.developer,
        newData.description,
        newData.logoUrl
      );

      const game = await gameRegistry.getGame(1);
      expect(game.name).to.equal(newData.name);
      expect(game.developer).to.equal(newData.developer);
      expect(game.description).to.equal(newData.description);
      expect(game.logoUrl).to.equal(newData.logoUrl);
    });

    it("Should emit GameUpdated event", async function () {
      await expect(
        gameRegistry.updateGame(
          1,
          "Updated Game",
          "Updated Developer",
          "Updated description",
          "https://example.com/updated-logo.png"
        )
      ).to.emit(gameRegistry, "GameUpdated")
        .withArgs(1);
    });

    it("Should deactivate game", async function () {
      await gameRegistry.deactivateGame(1);
      
      const game = await gameRegistry.getGame(1);
      expect(game.isActive).to.equal(false);
    });

    it("Should emit GameDeactivated event", async function () {
      await expect(gameRegistry.deactivateGame(1))
        .to.emit(gameRegistry, "GameDeactivated")
        .withArgs(1);
    });

    it("Should reactivate game", async function () {
      await gameRegistry.deactivateGame(1);
      await gameRegistry.reactivateGame(1);
      
      const game = await gameRegistry.getGame(1);
      expect(game.isActive).to.equal(true);
    });

    it("Should emit GameReactivated event", async function () {
      await gameRegistry.deactivateGame(1);
      
      await expect(gameRegistry.reactivateGame(1))
        .to.emit(gameRegistry, "GameReactivated")
        .withArgs(1);
    });
  });

  describe("Game Queries", function () {
    beforeEach(async function () {
      await gameRegistry.registerGame(
        "Game 1",
        "Developer 1",
        "First game",
        "https://example.com/logo1.png",
        developer1.address
      );

      await gameRegistry.registerGame(
        "Game 2",
        "Developer 2",
        "Second game",
        "https://example.com/logo2.png",
        developer2.address
      );
    });

    it("Should return correct game count", async function () {
      expect(await gameRegistry.getGameCount()).to.equal(2);
    });

    it("Should return game by ID", async function () {
      const game = await gameRegistry.getGame(1);
      expect(game.name).to.equal("Game 1");
      expect(game.developer).to.equal("Developer 1");
    });

    it("Should return game by contract address", async function () {
      const gameId = await gameRegistry.getGameByContract(developer1.address);
      expect(gameId).to.equal(1);
    });

    it("Should return zero for non-existent contract", async function () {
      const gameId = await gameRegistry.getGameByContract(owner.address);
      expect(gameId).to.equal(0);
    });
  });

  describe("Pausable Functionality", function () {
    it("Should pause and unpause by owner", async function () {
      await gameRegistry.pause();
      expect(await gameRegistry.paused()).to.equal(true);

      await gameRegistry.unpause();
      expect(await gameRegistry.paused()).to.equal(false);
    });

    it("Should fail to register game when paused", async function () {
      await gameRegistry.pause();

      await expect(
        gameRegistry.registerGame(
          "Test Game",
          "Test Developer",
          "A test game",
          "https://example.com/logo.png",
          developer1.address
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should fail to pause by non-owner", async function () {
      await expect(
        gameRegistry.connect(developer1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 