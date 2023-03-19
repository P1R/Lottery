import { ethers } from "hardhat";
import * as readline from "readline";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Lottery__factory, LotteryToken__factory } from "../typechain-types";
import * as dotenv from 'dotenv';
dotenv.config();

// First you must deploy a Loterry contract to a network
const contractAddress: string = "0x2F0cF8a8ffAa5e406aD4f158891931292740aFEC";
//const tokenAddress: string = "0x7B3d9602a9a27cA2E8867c68AC816feA6C096449";
let contract: Lottery__factory;
let token: LotteryToken__factory;
let accounts: SignerWithAddress[];
//const provider = ethers.getDefaultProvider("goerli");
//const provider = new ethers.providers.InfuraProvider(
//    "maticmum",
//    process.env.INFURA_API_KEY
//);
const provider = new ethers.providers.InfuraProvider(
    "goerli",
    process.env.INFURA_API_KEY
);
  

//const BET_PRICE = 1;
// 0.1 % fee don't be geedy ;)
//const BET_FEE = 0.01;
// costs 1 miliETH
//const TOKEN_RATIO = 1000;

async function main() {
  await initAccounts();
  await initContracts();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  mainMenu(rl);
}

async function initContracts() {
  const contractFactory = await new Lottery__factory(accounts[0]);
  // Attach from an already deployed contract
  contract = await contractFactory.attach(contractAddress);
  console.log(
    `attached Lottery contract address is ${contract.address}` 
  );
  await contract.deployed();
  // Request the contract address
  const tokenAddress = await contract.paymentToken();
  // Creates a factory with the default signer
  const tokenFactory = await new LotteryToken__factory(accounts[0]);
  token = tokenFactory.attach(tokenAddress);
  console.log(
    `attached LotteryToken contract address is ${token.address}` 
  );
}

async function initAccounts() {
  let pkey: string;
  let wallet:  ethers.Wallet;
  // Signer 1 the team3 shared and contract Owner
  pkey = process.env.PRIVATE_KEY_ACCOUNT1;
  wallet = new ethers.Wallet(`${pkey}`);
  const signer = wallet.connect(provider);
  // Signer 2 David Testing Personal Key
  pkey = process.env.PRIVATE_KEY_ACCOUNT2;
  wallet = new ethers.Wallet(`${pkey}`);
  const signer2 = wallet.connect(provider);
  // Signer 3 David Testing Personal Key
  pkey = process.env.PRIVATE_KEY_ACCOUNT3;
  wallet = new ethers.Wallet(`${pkey}`);
  const signer3 = wallet.connect(provider);
  
  accounts = [ signer, signer2, signer3 ];
}

async function mainMenu(rl: readline.Interface) {
  menuOptions(rl);
}

function menuOptions(rl: readline.Interface) {
  rl.question(
    "Select operation: \n Options: \n [0]: Exit \n [1]: Check state \n [2]: Open bets \n [3]: Top up account tokens \n [4]: Bet with account \n [5]: Close bets \n [6]: Check player prize \n [7]: Withdraw \n [8]: Burn tokens \n",
    async (answer: string) => {
      console.log(`Selected: ${answer}\n`);
      const option = Number(answer);
      switch (option) {
        case 0:
          rl.close();
          return;
        case 1:
          await checkState();
          mainMenu(rl);
          break;
        case 2:
          rl.question("Input duration (in seconds)\n", async (duration) => {
            try {
              await openBets(duration);
            } catch (error) {
              console.log("error\n");
              console.log({ error });
            }
            mainMenu(rl);
          });
          break;
        case 3:
          rl.question("What account (index) to use?\n", async (index) => {
            await displayBalance(index);
            rl.question("Buy how many tokens?\n", async (amount) => {
              try {
                await buyTokens(index, amount);
                await displayBalance(index);
                await displayTokenBalance(index);
              } catch (error) {
                console.log("error\n");
                console.log({ error });
              }
              mainMenu(rl);
            });
          });
          break;
        case 4:
          rl.question("What account (index) to use?\n", async (index) => {
            await displayTokenBalance(index);
            rl.question("Bet how many times?\n", async (amount) => {
              try {
                await bet(index, amount);
                await displayTokenBalance(index);
              } catch (error) {
                console.log("error\n");
                console.log({ error });
              }
              mainMenu(rl);
            });
          });
          break;
        case 5:
          try {
            await closeLottery();
          } catch (error) {
            console.log("error\n");
            console.log({ error });
          }
          mainMenu(rl);
          break;
        case 6:
          rl.question("What account (index) to use?\n", async (index) => {
            const prize = await displayPrize(index);
            if (Number(prize) > 0) {
              rl.question(
                "Do you want to claim your prize? [Y/N]\n",
                async (answer) => {
                  if (answer.toLowerCase() === "y") {
                    try {
                      await claimPrize(index, prize);
                    } catch (error) {
                      console.log("error\n");
                      console.log({ error });
                    }
                  }
                  mainMenu(rl);
                }
              );
            } else {
              mainMenu(rl);
            }
          });
          break;
        case 7:
          await displayTokenBalance("0");
          await displayOwnerPool();
          rl.question("Withdraw how many tokens?\n", async (amount) => {
            try {
              await withdrawTokens(amount);
            } catch (error) {
              console.log("error\n");
              console.log({ error });
            }
            mainMenu(rl);
          });
          break;
        case 8:
          rl.question("What account (index) to use?\n", async (index) => {
            await displayTokenBalance(index);
            rl.question("Burn how many tokens?\n", async (amount) => {
              try {
                await burnTokens(index, amount);
                await displayBalance(index);
                await displayTokenBalance(index);
              } catch (error) {
                console.log("error\n");
                console.log({ error });
              }
              mainMenu(rl);
            });
          });
          break;
        default:
          throw new Error("Invalid option");
      }
    }
  );
}

async function checkState() {
  const state = await contract.betsOpen();
  console.log(`The lottery is ${state ? "open" : "closed"}\n`);
  if (!state) return;
  const currentBlock = await ethers.provider.getBlock("latest");
  const currentBlockDate = new Date(currentBlock.timestamp * 1000);
  const closingTime = await contract.betsClosingTime();
  const closingTimeDate = new Date(closingTime.toNumber() * 1000);
  console.log(
    `The last block was mined at ${currentBlockDate.toLocaleDateString()} : ${currentBlockDate.toLocaleTimeString()}\n`
  );
  console.log(
    `lottery should close at ${closingTimeDate.toLocaleDateString()} : ${closingTimeDate.toLocaleTimeString()}\n`
  );
}

async function openBets(duration: string) {
  const currentBlock = await ethers.provider.getBlock("latest");
  const tx = await contract.openBets(currentBlock.timestamp + Number(duration));
  const receipt = await tx.wait();
  console.log(`Bets opened (${receipt.transactionHash})`);
}

async function displayBalance(index: string) {
  const balanceBN = await ethers.provider.getBalance(
    accounts[Number(index)].address
  );
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(
    `The account of address ${
      accounts[Number(index)].address
    } has ${balance} ETH\n`
  );
}

async function buyTokens(index: string, amount: string) {
  const tx = await contract.connect(accounts[Number(index)]).purchaseTokens({
    value: ethers.utils.parseEther(amount).div(TOKEN_RATIO),
  });
  const receipt = await tx.wait();
  console.log(`Tokens bought (${receipt.transactionHash})\n`);
}

async function displayTokenBalance(index: string) {
  const balanceBN = await token.balanceOf(accounts[Number(index)].address);
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(
    `The account of address ${
      accounts[Number(index)].address
    } has ${balance} LT0\n`
  );
}

async function bet(index: string, amount: string) {
  const allowTx = await token
    .connect(accounts[Number(index)])
    .approve(contract.address, ethers.constants.MaxUint256);
  await allowTx.wait();
  const tx = await contract.connect(accounts[Number(index)]).betMany(amount);
  const receipt = await tx.wait();
  console.log(`Bets placed (${receipt.transactionHash})\n`);
}

async function closeLottery() {
  const tx = await contract.closeLottery();
  const receipt = await tx.wait();
  console.log(`Bets closed (${receipt.transactionHash})\n`);
}

async function displayPrize(index: string): Promise<string> {
  const prizeBN = await contract.prize(accounts[Number(index)].address);
  const prize = ethers.utils.formatEther(prizeBN);
  console.log(
    `The account of address ${
      accounts[Number(index)].address
    } has earned a prize of ${prize} Tokens\n`
  );
  return prize;
}

async function claimPrize(index: string, amount: string) {
  const tx = await contract
    .connect(accounts[Number(index)])
    .prizeWithdraw(ethers.utils.parseEther(amount));
  const receipt = await tx.wait();
  console.log(`Prize claimed (${receipt.transactionHash})\n`);
}

async function displayOwnerPool() {
  const balanceBN = await contract.ownerPool();
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(`The owner pool has (${balance}) Tokens \n`);
}

async function withdrawTokens(amount: string) {
  const tx = await contract.ownerWithdraw(ethers.utils.parseEther(amount));
  const receipt = await tx.wait();
  console.log(`Withdraw confirmed (${receipt.transactionHash})\n`);
}

async function burnTokens(index: string, amount: string) {
  const allowTx = await token
    .connect(accounts[Number(index)])
    .approve(contract.address, ethers.constants.MaxUint256);
  const receiptAllow = await allowTx.wait();
  console.log(`Allowance confirmed (${receiptAllow.transactionHash})\n`);
  const tx = await contract
    .connect(accounts[Number(index)])
    .returnTokens(ethers.utils.parseEther(amount));
  const receipt = await tx.wait();
  console.log(`Burn confirmed (${receipt.transactionHash})\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
