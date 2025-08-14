// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleGameRegistry
 * @dev Simplified game registry without OpenZeppelin dependencies
 */
contract SimpleGameRegistry {
    // Game structure
    struct Game {
        uint256 id;
        string name;
        string developer;
        string description;
        string logoUrl;
        address contractAddress;
        bool isVerified;
        bool isActive;
        uint256 registeredAt;
    }

    // State variables
    uint256 public gameCounter;
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public gameByContract;
    mapping(address => uint256[]) public developerGames;
    
    // Events
    event GameRegistered(uint256 indexed gameId, string name, address indexed developer, address contractAddress);
    event GameVerified(uint256 indexed gameId);
    event GameUpdated(uint256 indexed gameId);
    event GameDeactivated(uint256 indexed gameId);
    event GameReactivated(uint256 indexed gameId);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier gameExists(uint256 gameId) {
        require(gameId > 0 && gameId <= gameCounter, "Game does not exist");
        _;
    }

    // Owner address
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Register a new game
     */
    function registerGame(
        string memory name,
        string memory developer,
        string memory description,
        string memory logoUrl,
        address contractAddress
    ) public {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(developer).length > 0, "Developer cannot be empty");
        require(contractAddress != address(0), "Invalid contract address");
        require(gameByContract[contractAddress] == 0, "Contract already registered");

        gameCounter++;
        
        games[gameCounter] = Game({
            id: gameCounter,
            name: name,
            developer: developer,
            description: description,
            logoUrl: logoUrl,
            contractAddress: contractAddress,
            isVerified: false,
            isActive: true,
            registeredAt: block.timestamp
        });

        gameByContract[contractAddress] = gameCounter;
        developerGames[msg.sender].push(gameCounter);

        emit GameRegistered(gameCounter, name, msg.sender, contractAddress);
    }

    /**
     * @dev Verify a game (only owner)
     */
    function verifyGame(uint256 gameId) public onlyOwner gameExists(gameId) {
        games[gameId].isVerified = true;
        emit GameVerified(gameId);
    }

    /**
     * @dev Update game information
     */
    function updateGame(
        uint256 gameId,
        string memory name,
        string memory developer,
        string memory description,
        string memory logoUrl
    ) public onlyOwner gameExists(gameId) {
        games[gameId].name = name;
        games[gameId].developer = developer;
        games[gameId].description = description;
        games[gameId].logoUrl = logoUrl;
        
        emit GameUpdated(gameId);
    }

    /**
     * @dev Deactivate a game
     */
    function deactivateGame(uint256 gameId) public onlyOwner gameExists(gameId) {
        games[gameId].isActive = false;
        emit GameDeactivated(gameId);
    }

    /**
     * @dev Reactivate a game
     */
    function reactivateGame(uint256 gameId) public onlyOwner gameExists(gameId) {
        games[gameId].isActive = true;
        emit GameReactivated(gameId);
    }

    /**
     * @dev Get game count
     */
    function getGameCount() public view returns (uint256) {
        return gameCounter;
    }

    /**
     * @dev Get game by ID
     */
    function getGame(uint256 gameId) public view gameExists(gameId) returns (Game memory) {
        return games[gameId];
    }

    /**
     * @dev Get game by contract address
     */
    function getGameByContract(address contractAddress) public view returns (uint256) {
        return gameByContract[contractAddress];
    }
} 