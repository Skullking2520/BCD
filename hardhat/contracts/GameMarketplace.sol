// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title GameMarketplace
 * @dev A marketplace for trading game items
 */
contract GameMarketplace {
    struct GameItem {
        uint256 id;
        string name;
        string description;
        uint256 price;
        address seller;
        bool isSold;
        uint256 rarity; // 1=Common, 2=Rare, 3=Epic, 4=Legendary, 5=Mythic
    }

    uint256 public itemCounter;
    mapping(uint256 => GameItem) public items;
    mapping(address => uint256[]) public userItems;
    
    event ItemListed(uint256 indexed itemId, string name, uint256 price, address indexed seller);
    event ItemSold(uint256 indexed itemId, string name, uint256 price, address indexed buyer, address indexed seller);
    event ItemPurchased(uint256 indexed itemId, string name, uint256 price, address indexed buyer);

    /**
     * @dev List a new game item for sale
     */
    function listItem(
        string memory name,
        string memory description,
        uint256 price,
        uint256 rarity
    ) public {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(price > 0, "Price must be greater than 0");
        require(rarity >= 1 && rarity <= 5, "Rarity must be between 1 and 5");

        itemCounter++;
        
        items[itemCounter] = GameItem({
            id: itemCounter,
            name: name,
            description: description,
            price: price,
            seller: msg.sender,
            isSold: false,
            rarity: rarity
        });

        userItems[msg.sender].push(itemCounter);

        emit ItemListed(itemCounter, name, price, msg.sender);
    }

    /**
     * @dev Purchase a game item
     */
    function buyItem(uint256 itemId) public payable {
        require(itemId > 0 && itemId <= itemCounter, "Item does not exist");
        require(!items[itemId].isSold, "Item is already sold");
        require(msg.value >= items[itemId].price, "Insufficient payment");
        require(msg.sender != items[itemId].seller, "Cannot buy your own item");

        GameItem storage item = items[itemId];
        item.isSold = true;

        // Transfer payment to seller
        payable(item.seller).transfer(item.price);

        // Refund excess payment
        if (msg.value > item.price) {
            payable(msg.sender).transfer(msg.value - item.price);
        }

        // Add item to buyer's collection
        userItems[msg.sender].push(itemId);

        emit ItemSold(itemId, item.name, item.price, msg.sender, item.seller);
        emit ItemPurchased(itemId, item.name, item.price, msg.sender);
    }

    /**
     * @dev Get item details
     */
    function getItem(uint256 itemId) public view returns (GameItem memory) {
        require(itemId > 0 && itemId <= itemCounter, "Item does not exist");
        return items[itemId];
    }

    /**
     * @dev Get all items
     */
    function getAllItems() public view returns (GameItem[] memory) {
        GameItem[] memory allItems = new GameItem[](itemCounter);
        for (uint256 i = 1; i <= itemCounter; i++) {
            allItems[i - 1] = items[i];
        }
        return allItems;
    }

    /**
     * @dev Get user's items
     */
    function getUserItems(address user) public view returns (uint256[] memory) {
        return userItems[user];
    }

    /**
     * @dev Get item count
     */
    function getItemCount() public view returns (uint256) {
        return itemCounter;
    }
} 