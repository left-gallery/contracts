import { ethers } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { solidity } from "ethereum-waffle";
import {
  LeftGallery__factory,
  LeftGallery,
  Metadata__factory,
  Metadata,
  LeftGalleryController__factory,
  LeftGalleryController,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);
chai.use(chaiAsPromised);
const { expect } = chai;
const { AddressZero } = ethers.constants;
const { parseEther } = ethers.utils;

describe("LeftGallery", () => {
  let metadata: Metadata;
  let token: LeftGallery;
  let controller: LeftGalleryController;
  let alice: SignerWithAddress,
    bob: SignerWithAddress,
    charly: SignerWithAddress;
  let aliceLG: LeftGallery, bobLG: LeftGallery, charlyLG: LeftGallery;
  let aliceC: LeftGalleryController,
    bobC: LeftGalleryController,
    charlyC: LeftGalleryController;

  beforeEach(async () => {
    [alice, bob, charly] = await ethers.getSigners();

    // Deploy Metadata.sol
    const MetadataFactory = (await ethers.getContractFactory(
      "Metadata",
      alice
    )) as Metadata__factory;
    metadata = await MetadataFactory.deploy();
    await metadata.deployed();

    // Deploy LeftGallery.sol
    const LeftGalleryFactory = (await ethers.getContractFactory(
      "LeftGallery",
      alice
    )) as LeftGallery__factory;
    token = await LeftGalleryFactory.deploy(
      "left.gallery",
      "LG",
      metadata.address
    );
    await token.deployed();

    // Connect the contract to different wallets
    aliceLG = token.connect(alice);
    bobLG = token.connect(bob);
    charlyLG = token.connect(charly);

    // Deploy LeftGalleryController.sol
    const LeftGalleryControllerFactory = (await ethers.getContractFactory(
      "LeftGalleryController",
      alice
    )) as LeftGalleryController__factory;
    controller = await LeftGalleryControllerFactory.deploy(
      token.address,
      alice.address
    );
    await controller.deployed();
    await token.updateController(controller.address);

    // Connect the contract to different wallets
    aliceC = controller.connect(alice);
    bobC = controller.connect(bob);
    charlyC = controller.connect(charly);
  });

  describe("LeftGallery.sol", () => {
    it("should allow owner to add and remove admins", async function () {
      // Bob cannot mint because he is not an admin
      await expect(bobLG.mint(bob.address, 1)).to.be.revertedWith(
        "DOES_NOT_HAVE_ADMIN_OR_CONTROLLER_ROLE"
      );
      await aliceLG.addAdmin(bob.address);

      // Bob can mint now
      expect(await bobLG.mint(bob.address, 1)).to.emit(token, "Transfer");
      await aliceLG.removeAdmin(bob.address);

      // Bob cannot mint because he is not an admin
      await expect(bobLG.mint(bob.address, 1)).to.be.revertedWith(
        "DOES_NOT_HAVE_ADMIN_OR_CONTROLLER_ROLE"
      );
    });

    it("should return metadata uints as strings", async function () {
      const URI = "https://left.gallery/v1/metadata/";

      let tokenURI_uint = 0;
      let tokenURI_result = await token.tokenURI(tokenURI_uint);
      expect(URI + tokenURI_uint.toString()).to.equal(tokenURI_result);

      tokenURI_uint = 2345;
      tokenURI_result = await token.tokenURI(tokenURI_uint);
      expect(URI + tokenURI_uint.toString()).to.equal(tokenURI_result);

      tokenURI_uint = 23452345;
      tokenURI_result = await token.tokenURI(tokenURI_uint);
      expect(URI + tokenURI_uint.toString()).to.equal(tokenURI_result);

      tokenURI_uint = 134452;
      tokenURI_result = await token.tokenURI(tokenURI_uint);
      expect(URI + tokenURI_uint.toString()).to.equal(tokenURI_result);
    });

    it("should mint a token from the owner account", async function () {
      // begin with zero balance
      let zeroBalance = await token.totalSupply();
      expect(zeroBalance.toString()).to.equal("0");

      // try minting a new token and checking the totalSupply
      expect(await token.mint(alice.address, 1))
        .to.emit(token, "Transfer")
        .withArgs(AddressZero, alice.address, 1);
      let totalSupply = await token.totalSupply();
      expect(totalSupply.toString()).to.equal("1");

      // check that the balance increased to 1
      let ownerBalance = await token.balanceOf(alice.address);
      expect(ownerBalance.toString()).to.equal("1");

      // make sure the token at index 0 has id 1
      let tokenId = await token.tokenOfOwnerByIndex(alice.address, "0");
      expect(tokenId.toString()).to.equal("1");
    });
  });

  describe("LeftGalleryController.sol", () => {
    it("should allow owner to add an artwork", async function () {
      // First artwork has workId 1
      expect(
        await controller.addArtwork(
          charly.address,
          10,
          2,
          parseEther("0.5"),
          100,
          25,
          false
        )
      )
        .to.emit(controller, "newWork")
        .withArgs(1, charly.address, 10, 2, parseEther("0.5"), 100, 25, false);
    });

    it("should increase the price with multiplier", async function () {
      expect(
        await controller.addArtwork(
          charly.address,
          10,
          2,
          parseEther("1"),
          110,
          25,
          false
        )
      )
        .to.emit(controller, "newWork")
        .withArgs(1, charly.address, 10, 2, parseEther("1"), 110, 25, false);

      const firstWorkBeforeSales = await bobC.works(1);
      expect(await bobC.buy(bob.address, 1, { value: parseEther("1.0") }))
        .to.emit(controller, "editionBought")
        .withArgs(
          1,
          1,
          "1000001",
          bob.address,
          parseEther("1.0"),
          parseEther("0.75"),
          parseEther("0.25")
        );

      expect(await bobC.buy(bob.address, 1, { value: parseEther("1.1") }))
        .to.emit(controller, "editionBought")
        .withArgs(
          1,
          2,
          "1000002",
          bob.address,
          parseEther("1.1"),
          parseEther("0.825"),
          parseEther("0.275")
        );

      expect(await bobC.buy(bob.address, 1, { value: parseEther("1.21") }))
        .to.emit(controller, "editionBought")
        .withArgs(
          1,
          3,
          "1000003",
          bob.address,
          parseEther("1.21"),
          parseEther("0.9075"),
          parseEther("0.3025")
        );
    });

    it("should allow someone to buy the artwork", async function () {
      // Alice adds Charly's artwork
      await controller.addArtwork(
        charly.address,
        3, // editions
        1, // APs
        parseEther("0.666"),
        100, // multiplier
        15,
        false
      );

      // Bob wants to buy all editions
      expect(await bobC.buy(bob.address, 1, { value: parseEther("0.666") }))
        .to.emit(controller, "editionBought")
        .withArgs(
          1,
          1,
          "1000001",
          bob.address,
          parseEther("0.666"),
          parseEther("0.5661"),
          parseEther("0.0999")
        );
      /*
        .to.emit(token, "Transfer")
        .withArgs(AddressZero, bob.address, "1000001");
        */

      expect(await bobC.buy(bob.address, 1, { value: parseEther("0.666") }))
        .to.emit(controller, "editionBought")
        .withArgs(
          1,
          2,
          "1000002",
          bob.address,
          parseEther("0.666"),
          parseEther("0.5661"),
          parseEther("0.0999")
        );
      /*
        .to.emit(token, "Transfer")
        .withArgs(AddressZero, bob.address, "1000002");
        */

      await expect(
        bobC.buy(bob.address, 1, { value: parseEther("0.666") })
      ).to.be.revertedWith("EDITIONS_EXCEEDED");
    });
  });
});
