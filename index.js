require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Middleware to add required CORS headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// 🔥 Blockchain Configuration
const CHAIN_ID = 31337;
const NETWORK_NAME = "Avlon Blockchain";
const RPC_URL = `http://localhost:${PORT}`;
const NATIVE_TOKEN = "ETH";
const NATIVE_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const DEFAULT_MINT_AMOUNT = 200;
const TEST_WALLET = "0xCCC324E27Aa67bd2DcC844E45cFd1fBA3A670340"; // Common test address

// Hardcoded wallet balances
const wallet = {
  [TEST_WALLET.toLowerCase()]: {
    [NATIVE_TOKEN_ADDRESS]: "999999998", // ETH balance
    "0xdac17f958d2ee523a2206206994597c13d831ec6": "410981", // USDT balance
    "0x6b175474e89094c44da98b954eedeac495271d05": "999999975", // BTC balance
    "0x50327c6c5a14dcba7072724f5cfffeb1b69cca10": "804500000000", // TRX balance
    "0xB8c77482e45F1F44dE1745F52C74426C631bDD51": "34", // BNB balance
  },
};

// Token configurations (address to details)
const tokenConfigs = {
  [NATIVE_TOKEN_ADDRESS]: {
    address: NATIVE_TOKEN_ADDRESS, // Native token address (e.g., ETH)
    symbol: "ETH", // Token symbol
    decimals: 18, // Decimal places
    name: "Ethereum", // Full token name
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", // Logo URL
  },
  "0xdac17f958d2ee523a2206206994597c13d831ec6": {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec6", // USDT contract address
    symbol: "USDT", // Token symbol
    decimals: 6, // Decimal places
    name: "Tether USD", // Full token name
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png", // Logo URL
  },
  "0x6b175474e89094c44da98b954eedeac495271d05": {
    address: "0x6b175474e89094c44da98b954eedeac495271d05",
    symbol: "BTC", // Token symbol
    decimals: 8, // Decimal places
    name: "Bitcoin", // Full token name
    image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png", // Logo URL
  },
  "0x50327c6c5a14dcba7072724f5cfffeb1b69cca10": {
    address: "0x50327c6c5a14dcba7072724f5cfffeb1b69cca10", // TRX contract address (TRX on Ethereum)
    symbol: "TRX", // Token symbol
    decimals: 6, // Decimal places
    name: "TRX", // Full token name
    image: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png", // Logo URL
  },
  "0xB8c77482e45F1F44dE1745F52C74426C631bDD51": {
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD51", // BNB contract address (BNB on Ethereum)
    symbol: "BNB", // Token symbol
    decimals: 18, // Decimal places
    name: "BNB", // Full token name
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", // Logo URL
  },
};
// 🌐 JSON-RPC Endpoint Handler
app.post("/", async (req, res) => {
  const { method, params, id } = req.body;
  console.log("📦 Request:", method, params, id);

  try {
    switch (method) {
      case "eth_chainId":
        res.json({ jsonrpc: "2.0", id, result: `0x${CHAIN_ID.toString(16)}` });
        break;

      case "net_version":
        res.json({ jsonrpc: "2.0", id, result: CHAIN_ID.toString() });
        break;

      case "eth_blockNumber":
        res.json({ jsonrpc: "2.0", id, result: "0x1" }); // Static block number
        break;
      case "eth_getBlockByNumber":
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            number: "0x1",
            hash: "0xabc123...",
            parentHash: "0xdef456...",
            nonce: "0x0",
            sha3Uncles: "0x0",
            logsBloom: "0x0",
            transactionsRoot: "0x0",
            stateRoot: "0x0",
            receiptsRoot: "0x0",
            miner: "0x0",
            difficulty: "0x0",
            totalDifficulty: "0x0",
            extraData: "0x0",
            size: "0x0",
            gasLimit: "0x0",
            gasUsed: "0x0",
            timestamp: "0x0",
            transactions: [],
            uncles: [],
          },
        });
        break;
      case "eth_getBalance": {
        const [address] = params;
        const formattedAddress = address.toLowerCase();

        // Get the balance for the specified address and native token
        const balance = wallet[formattedAddress]?.[NATIVE_TOKEN_ADDRESS] || "0";

        // Convert the balance to Wei (assuming 18 decimals for ETH)
        const balanceWei = BigInt(balance) * 10n ** 18n;

        // Return the balance in hex format
        res.json({ jsonrpc: "2.0", id, result: `0x${balanceWei.toString(16)}` });
        break;
      }

      case "eth_sendTransaction": {
        const [tx] = params;
        const from = tx.from.toLowerCase();
        const to = tx.to.toLowerCase();
        const valueWei = BigInt(tx.value || "0x0");
        const amount = Number(valueWei / 10n ** 18n); // ETH uses 18 decimals

        // Check if sender and receiver exist in the wallet
        if (!wallet[from] || !wallet[to]) {
          throw new Error("Sender or receiver address not found");
        }

        // Check sender's balance
        const senderBalance = wallet[from][NATIVE_TOKEN_ADDRESS] || "0";
        if (Number(senderBalance) < amount) {
          throw new Error("Insufficient balance");
        }

        // Update balances
        wallet[from][NATIVE_TOKEN_ADDRESS] = (Number(senderBalance) - amount).toString();
        wallet[to][NATIVE_TOKEN_ADDRESS] = (Number(wallet[to][NATIVE_TOKEN_ADDRESS] || "0") + amount).toString();

        // Generate mock transaction hash
        const txHash = `0x${Buffer.from(Date.now().toString()).toString("hex")}${Math.random().toString(16).slice(2)}`;
        res.json({ jsonrpc: "2.0", id, result: txHash });
        break;
      }

      case "eth_call": {
        const [txObj] = params;
        const { to, data, from } = txObj || {};
         if (!to && data.startsWith("0x95d89b41")) {
          // Optionally, return a default symbol (e.g., "ETH" or any token symbol)
           res.json({ jsonrpc: "2.0", id, result: "0x455448" }); // "ETH" in hex
          break;
        }
        if (!to || !data) throw new Error("Invalid call parameters");

        const tokenAddress = to.toLowerCase();
        const tokenConfig = tokenConfigs[tokenAddress] || { decimals: 18 };

        // Handle balanceOf(address)
        if (data.startsWith("0x70a08231")) {
          const encodedAddress = data.slice(10, 74);
          const address = `0x${encodedAddress.slice(24)}`.toLowerCase();

          // Get the balance from the hardcoded wallet
          const balance = wallet[address]?.[tokenAddress] || "0";
          const balanceBase = BigInt(balance * 10 ** tokenConfig.decimals);

          res.json({ jsonrpc: "2.0", id, result: `0x${balanceBase.toString(16).padStart(64, "0")}` });
          break;
        }

        // Handle transfer(address,uint256)
        if (data.startsWith("0xa9059cbb")) {
          if (!from) throw new Error("Sender address required");
          const sender = from.toLowerCase();

          const encodedRecipient = data.slice(10, 74);
          const recipient = `0x${encodedRecipient.slice(24)}`.toLowerCase();
          const encodedAmount = data.slice(74, 138);
          const amountBase = BigInt(`0x${encodedAmount}`);
          const amount = Number(amountBase / 10n ** BigInt(tokenConfig.decimals));

          // Check if sender and recipient exist in the wallet
          if (!wallet[sender] || !wallet[recipient]) {
            throw new Error("Sender or recipient address not found");
          }

          // Check sender's balance
          const senderBalance = wallet[sender][tokenAddress] || "0";
          if (Number(senderBalance) < amount) {
            throw new Error("Insufficient balance");
          }

          // Update balances
          wallet[sender][tokenAddress] = (Number(senderBalance) - amount).toString();
          wallet[recipient][tokenAddress] = (Number(wallet[recipient][tokenAddress] || "0") + amount).toString();

          res.json({ jsonrpc: "2.0", id, result: "0x0000000000000000000000000000000000000000000000000000000000000001" });
          break;
        }

        res.json({ jsonrpc: "2.0", id, result: "0x" });
        break;
      }

      case "eth_gasPrice":
      case "eth_estimateGas":
        res.json({ jsonrpc: "2.0", id, result: "0x0" });
        break;

      default:
        res.status(400).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unsupported method: ${method}` },
        });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: error.message },
    });
  }
});

// ℹ️ Network Info Endpoint
app.get("/", (req, res) => {
  res.json({
    chainId: CHAIN_ID,
    network: NETWORK_NAME,
    rpcUrl: RPC_URL,
    nativeToken: NATIVE_TOKEN,
  });
});

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`🌐 RTDB Blockchain running at ${RPC_URL}`);
  console.log(`🔧 Configure MetaMask with these settings:`);
  console.log(`   Network Name: ${NETWORK_NAME}`);
  console.log(`   RPC URL: ${RPC_URL}`);
  console.log(`   Chain ID: ${CHAIN_ID}`);
  console.log(`   Currency Symbol: ${NATIVE_TOKEN}`);
  console.log(`✨ Test Wallet: ${TEST_WALLET}`);
});
