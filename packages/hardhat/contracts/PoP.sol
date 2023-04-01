// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "base64-sol/base64.sol";

contract PoP is ERC721Enumerable, Ownable {
    using Strings for uint256;
    using Strings for uint16;

    uint256 private constant MINT_COST = 0.01 ether;
    uint256 private _tokenIds;
    struct ChatHistory {
        string ipfsHash;
        address signer;
        bytes signature;
    }
    mapping(uint256 => ChatHistory) private histories;

    constructor() ERC721("Proof of Prompt", "POPAI") {}

    function mint(address to, string memory ipfsHash, bytes memory signature) public payable {
        require(msg.value >= MINT_COST, "Insufficient ETH to mint token");

        uint256 id = _tokenIds;

        ChatHistory storage newHistory = histories[id];
        newHistory.ipfsHash = ipfsHash;
        newHistory.signer = to;
        newHistory.signature = signature;
        
        _safeMint(to, id);
        // _setTokenURI(id, ipfsHash);
        _tokenIds = _tokenIds + 1;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERROR: Item does not exist");
        ChatHistory memory history = histories[tokenId];
        string memory ipfsHash = history.ipfsHash;
        
        return ipfsHash;
    }

    function tokenSignature(uint256 tokenId) public view returns (bytes memory) {
        require(_exists(tokenId), "ERROR: Item does not exist");
        ChatHistory memory history = histories[tokenId];
        bytes memory signature = history.signature;
        
        return signature;
    }

    function withdrawFunds() external onlyOwner {
        uint256 contractBalance = address(this).balance;
        
        // transfer the balance to the owner
        payable(owner()).transfer(contractBalance);
    }
}
