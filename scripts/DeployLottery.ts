import { ethers } from "hardhat";
import { Lottery__factory, LotteryToken__factory } from "../typechain-types";
import * as dotenv from 'dotenv';
dotenv.config();

let contract: Lottery;
let token: LotteryToken;


const BET_PRICE = 1;
// 0.1 % fee don't be geedy ;)
const BET_FEE = 0.01;
// costs 1 miliETH
const TOKEN_RATIO = 1000;

async function main() {

  // Deploy Lottery Contract
  const provider = ethers.getDefaultProvider("goerli");
  //const provider = new ethers.providers.InfuraProvider(
  //    "maticmum",
  //    process.env.INFURA_API_KEY
  //);
  //const provider = new ethers.providers.InfuraProvider(
  //    "goerli",
  //    process.env.INFURA_API_KEY
  //);

  console.log({ provider });
  const pkey = process.env.PRIVATE_KEY_ACCOUNT1;
  console.log({ pkey });
  const lastBlock = await provider.getBlock("latest");
  console.log({ lastBlock.number });
  const wallet = new ethers.Wallet(`${pkey}`);
  const signer = wallet.connect(provider);

  // Deploy Lottery Contract
  console.log("Deploying Lottery contract");
  const contractFactory = await new Lottery__factory(signer);
  //const contractFactory = await ethers.getContractFactory("Lottery");
  contract = await contractFactory.deploy(
    "LotteryToken",
    "LT0",
    TOKEN_RATIO,
    ethers.utils.parseEther(BET_PRICE.toFixed(18)),
    ethers.utils.parseEther(BET_FEE.toFixed(18))
  );
  const deployedTransactionRecipt = await contract.deployTransaction.wait();
  console.log(
    `the Lottery contract was deployed at the address ${contract.address}` 
  );

  console.log(`The Lottery contract got deployed at block number ${deployedTransactionRecipt.blockNumber}`);

  const tokenAddress = await contract.paymentToken();
  console.log(
    `the LotteryToken was deployed with the address ${tokenAddress}` 
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
})
