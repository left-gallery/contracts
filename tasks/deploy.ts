import { task } from "hardhat/config";
import {
  LeftGalleryController__factory,
  LeftGallery__factory,
  Metadata__factory,
} from "../typechain";

import { join } from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

interface INetwork {
  [id: string]: {
    address: string;
    transactionHash: string;
  };
}

async function extract(contract: string, network: INetwork, outdir: string) {
  try {
    await mkdir(outdir);
  } catch (e) {
    if (e.code !== "EEXIST") {
      throw e;
    }
  }
  const dirname = `./artifacts/contracts/${contract}.sol`;
  const filename = contract + ".json";
  const infile = join(dirname, filename);
  const artifact = JSON.parse(await readFile(infile, "utf8"));
  const content = { abi: artifact.abi, networks: network };
  let outfile = join(outdir, filename);
  await writeFile(outfile, JSON.stringify(content, null, 2));
}

task("deploy", "Deploy Contracts")
  .addOptionalParam("outdir", "Where to output", "dist")
  .setAction(async ({ outdir }, hre) => {
    const { ethers } = hre;
    const { chainId } = await hre.ethers.provider.getNetwork();
    const [account] = await ethers.getSigners();
    console.log("Account is", account.address);

    // Deploy Metadata.sol
    console.log("Metadata");
    const MetadataFactory = (await ethers.getContractFactory(
      "Metadata"
    )) as Metadata__factory;
    const metadata = await MetadataFactory.deploy();
    console.log("  Address", metadata.address);
    const metadataReceipt = await metadata.deployed();
    console.log("  Tx hash", metadataReceipt.deployTransaction.hash);
    extract(
      "Metadata",
      {
        [chainId]: {
          address: metadata.address,
          transactionHash: metadataReceipt.deployTransaction.hash,
        },
      },
      outdir
    );

    // Deploy LeftGallery.sol
    console.log("LeftGallery");
    const LeftGalleryFactory = (await ethers.getContractFactory(
      "LeftGallery"
    )) as LeftGallery__factory;
    const token = await LeftGalleryFactory.deploy(
      "left.gallery",
      "lg",
      metadata.address
    );
    console.log("  Address", token.address);
    const tokenReceipt = await token.deployed();
    console.log("  Tx hash", tokenReceipt.deployTransaction.hash);
    extract(
      "LeftGallery",
      {
        [chainId]: {
          address: token.address,
          transactionHash: tokenReceipt.deployTransaction.hash,
        },
      },
      outdir
    );

    // Deploy LeftGalleryController.sol
    console.log("LeftGalleryController");
    const LeftGalleryControllerFactory = (await ethers.getContractFactory(
      "LeftGalleryController"
    )) as LeftGalleryController__factory;
    const controller = await LeftGalleryControllerFactory.deploy(
      token.address,
      account.address
    );
    console.log("  Address", controller.address);
    const controllerReceipt = await controller.deployed();
    console.log("  Tx hash", controllerReceipt.deployTransaction.hash);
    extract(
      "LeftGalleryController",
      {
        [chainId]: {
          address: controller.address,
          transactionHash: controllerReceipt.deployTransaction.hash,
        },
      },
      outdir
    );

    console.log("LeftGallery.updateController");
    const updateTx = await token.updateController(controller.address);
    const updateReceipt = updateTx.wait();
    console.log("  Tx hash", updateTx.hash);
    console.log(`Configuration exported to "${outdir}"`);

    /*
    const config = {
      [chainId]: {
        Storage: metadata.address,
      },
    };

    console.log("Configuration file in ./artifacts/network.json");
    await writeFile(
      "./artifacts/network.json",
      JSON.stringify(config, null, 2)
    );
    */
  });
