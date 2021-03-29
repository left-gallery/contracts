/**
 *           __     ______
 *          / /__  / __/ /_
 *         / / _ \/ /_/ __/
 *        / /  __/ __/ /_____
 *       /_/\___/_/__\__/ / /__  _______  __
 *         / __ `/ __ `/ / / _ \/ ___/ / / /
 *        / /_/ / /_/ / / /  __/ /  / /_/ /
 *        \__, /\__,_/_/_/\___/_/   \__, /
 *       /____/                    /____/
 *
 * https://github.com/left-gallery/contracts/
 *
 * Forked from folia-app/folia-contracts: https://github.com/folia-app/folia-contracts
 * Many thanks to Billy Rennekamp <https://github.com/okwme> and Folia <https://www.folia.app/> 💚
 */

pragma solidity ^0.5.0;

/**
 * The LeftGalleryController is an upgradeable endpoint for controlling LeftGallery.sol
 */

import "./LeftGallery.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract LeftGalleryController is Ownable {
    event newWork(
        uint256 workId,
        address payable artist,
        uint256 editions,
        uint256 AP,
        uint256 price,

         // this is a percentage, where 100 means the price remains the same
         // 200 means the price is doubled for each edition

        uint256 priceMultiplier,
        uint256 adminSplit,
        bool paused
    );

    event updatedWork(
        uint256 workId,
        address payable artist,
        uint256 editions,
        uint256 AP,
        uint256 price,
        uint256 priceMultiplier,
        uint256 adminSplit,
        bool paused
    );

    event editionBought(
        uint256 workId,
        uint256 editionId,
        uint256 tokenId,
        address recipient,
        uint256 paid,
        uint256 artistReceived,
        uint256 adminReceived
    );

    using SafeMath for uint256;

    uint256 constant MAX_EDITIONS = 1000000;
    uint256 public latestWorkId;

    mapping(uint256 => Work) public works;
    struct Work {
        bool exists;
        bool paused;
        uint256 adminSplit;
        uint256 editions;
        uint256 AP;
        uint256 printed;
        uint256 price;
        uint256 priceMultiplier;
        address payable artist;
    }

    address payable public adminWallet;
    bool public paused;
    LeftGallery public leftGallery;

    modifier notPaused() {
        require(!paused, "Must not be paused");
        _;
    }

    constructor(LeftGallery _leftGallery, address payable _adminWallet) public {
        leftGallery = _leftGallery;
        adminWallet = _adminWallet;
    }

    function addArtwork(
        address payable artist,
        uint256 editions,
        uint256 AP,
        uint256 price,
        uint256 priceMultiplier,
        uint256 adminSplit,
        bool _paused
    ) public onlyOwner {
        require(editions < MAX_EDITIONS, "MAX_EDITIONS_EXCEEDED");
        require(AP < editions, "WORK_AP_EXCEEDS_EDITION");
        latestWorkId += 1;

        works[latestWorkId].exists = true;
        works[latestWorkId].editions = editions;
        works[latestWorkId].AP = AP;
        works[latestWorkId].price = price;
        works[latestWorkId].priceMultiplier = priceMultiplier;
        works[latestWorkId].artist = artist;
        works[latestWorkId].adminSplit = adminSplit;
        works[latestWorkId].paused = _paused;

        emit newWork(
            latestWorkId,
            artist,
            editions,
            AP,
            price,
            priceMultiplier,
            adminSplit,
            _paused
        );
    }

    function updateArtworkPaused(uint256 workId, bool _paused)
        public
        onlyOwner
    {
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");
        works[workId].paused = _paused;
        emit updatedWork(
            workId,
            works[workId].artist,
            works[workId].editions,
            works[workId].AP,
            works[workId].price,
            works[workId].priceMultiplier,
            works[workId].adminSplit,
            works[workId].paused
        );
    }

    function updateArtworkEditions(uint256 workId, uint256 _editions)
        public
        onlyOwner
    {
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");
        require(works[workId].printed < _editions, "WORK_EXCEEDS_EDITIONS");
        works[workId].editions = _editions;
        emit updatedWork(
            workId,
            works[workId].artist,
            works[workId].editions,
            works[workId].AP,
            works[workId].price,
            works[workId].priceMultiplier,
            works[workId].adminSplit,
            works[workId].paused
        );
    }

    function updateArtworkPrice(uint256 workId, uint256 _price)
        public
        onlyOwner
    {
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");
        works[workId].price = _price;
        emit updatedWork(
            workId,
            works[workId].artist,
            works[workId].editions,
            works[workId].AP,
            works[workId].price,
            works[workId].priceMultiplier,
            works[workId].adminSplit,
            works[workId].paused
        );
    }

    function updateArtworkAP(uint256 workId, uint256 _AP)
        public
        onlyOwner
    {
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");
        require(_AP < works[workId].editions, "WORK_AP_EXCEEDS_EDITION");
        works[workId].AP = _AP;
        emit updatedWork(
            workId,
            works[workId].artist,
            works[workId].editions,
            works[workId].AP,
            works[workId].price,
            works[workId].priceMultiplier,
            works[workId].adminSplit,
            works[workId].paused
        );
    }

    function updateArtworkArtist(uint256 workId, address payable _artist)
        public
        onlyOwner
    {
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");
        works[workId].artist = _artist;
        emit updatedWork(
            workId,
            works[workId].artist,
            works[workId].editions,
            works[workId].AP,
            works[workId].price,
            works[workId].priceMultiplier,
            works[workId].adminSplit,
            works[workId].paused
        );
    }

    function nextPrice(uint256 workId) internal view returns (uint256) {
        if (works[workId].printed == 0) {
            return works[workId].price;
        }
        return works[workId].price.mul(works[workId].priceMultiplier).div(100);
    }

    function buy(address recipient, uint256 workId)
        public
        payable
        notPaused
        returns (bool)
    {
        require(!works[workId].paused, "WORK_NOT_YET_FOR_SALE");
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");

        uint256 currentPrice = nextPrice(workId);

        require(msg.value >= currentPrice, "DID_NOT_SEND_PRICE");

        
        require(
            works[workId].editions - works[workId].AP > works[workId].printed,
            "EDITIONS_EXCEEDED"
        );
        
        works[workId].price = currentPrice;
        uint256 editionId = works[workId].printed.add(1);
        works[workId].printed = editionId;

        uint256 tokenId = workId.mul(MAX_EDITIONS).add(editionId);

        leftGallery.mint(recipient, tokenId);

        uint256 adminReceives = msg.value.mul(works[workId].adminSplit).div(100);
        uint256 artistReceives = msg.value.sub(adminReceives);

        adminWallet.transfer(adminReceives);
        works[workId].artist.transfer(artistReceives);

        emit editionBought(
            workId,
            editionId,
            tokenId,
            recipient,
            msg.value,
            artistReceives,
            adminReceives
        );
    }

    function updateAdminSplit(uint256 workId, uint256 adminSplit) public onlyOwner {
        require(adminSplit <= 100, "SPLIT_MUST_BE_LTE_100");
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");
        works[workId].adminSplit = adminSplit;
         emit updatedWork(
            workId,
            works[workId].artist,
            works[workId].editions,
            works[workId].AP,
            works[workId].price,
            works[workId].priceMultiplier,
            works[workId].adminSplit,
            works[workId].paused
        );
    }

    function updatePriceExponent(uint256 workId, uint256 priceMultiplier) public onlyOwner {
        require(works[workId].exists, "WORK_DOES_NOT_EXIST");
        works[workId].priceMultiplier = priceMultiplier;
        emit updatedWork(
            workId,
            works[workId].artist,
            works[workId].editions,
            works[workId].AP,
            works[workId].price,
            works[workId].priceMultiplier,
            works[workId].adminSplit,
            works[workId].paused
        );
    }

    function updateAdminWallet(address payable _adminWallet) public onlyOwner {
        adminWallet = _adminWallet;
    }

    function updatePaused(bool _paused) public onlyOwner {
        paused = _paused;
    }
}
