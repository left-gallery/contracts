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

describe("LeftGallery", () => {
  let metadata: Metadata;
  let token: LeftGallery;
  let controller: LeftGalleryController;
  let alice: SignerWithAddress,
    bob: SignerWithAddress,
    charly: SignerWithAddress;
  let aliceLG: LeftGallery, bobLG: LeftGallery, charlyLG: LeftGallery;

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
    await token.deployed();
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

    it("should allow owner to move funds", async function () {
      const amount = ethers.utils.parseEther("1");
      const balanceBefore = await charly.getBalance();
      await bob.sendTransaction({
        to: token.address,
        value: amount,
      });
      await aliceLG.moveEth(charly.address, amount);
      const balanceAfter = await charly.getBalance();
      const diff = balanceAfter.sub(balanceBefore).toString();
      expect(diff).to.equal(amount);
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
});
