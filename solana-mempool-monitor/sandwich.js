const { createClient } = require('graphql-ws');
const express = require('express');
const WebSocket = require('ws');
const {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
} = require('@solana/web3.js');
const Bottleneck = require('bottleneck');

const app = express();
const port = 3000;

// Solana Configuration
const secretKey = Uint8Array.from([13, 57, 62, 145, 107, 151, 170, 71, 136, 111, 174, 165, 21, 81, 58, 57, 136, 117, 132, 146, 238, 73, 187, 136, 119, 56, 10, 248, 104, 44, 252, 42, 28, 238, 86, 29, 178, 155, 217, 72, 72, 84, 64, 191, 137, 158, 199, 48, 141, 1, 215, 148, 37, 192, 102, 129, 100, 57, 194, 182, 159, 0, 227, 39]);
const keypair = Keypair.fromSecretKey(secretKey);
const connection = new Connection('https://api.devnet.solana.com');

// Constants
const GRAPHQL_URL = '#';
const LARGE_TRANSACTION_THRESHOLD_USD = 50000;
const SLIPPAGE_TOLERANCE = 0.01;
const FIXED_TRANSACTION_FEE_SOL = 0.000005;

// Initialize Bottleneck to manage rate limits
const limiter = new Bottleneck({
    maxConcurrent: 20,
    minTime: 500,
});

// Initialize WebSocket Client
const client = createClient({
    url: GRAPHQL_URL,
    webSocketImpl: WebSocket,
});

let initialBalance;

// Utility to fetch account balance
async function fetchBalance() {
    const balance = await connection.getBalance(keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
}

// Utility to retry actions with exponential backoff
async function retryWithBackoff(fn, retries = 5, delay = 1000) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`Retry ${attempt + 1} failed. Retrying in ${delay}ms...`);
            console.error(error);  // Log the error
            if (attempt === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
}

// Initialize and log the initial balance
async function initializeBalance() {
    initialBalance = await fetchBalance();
    console.log(`Initial balance: ${initialBalance.toFixed(2)} SOL`);
}

// Check if balance doubled or dropped to a threshold
async function checkBalanceConditions() {
    const currentBalance = await fetchBalance();
    if (currentBalance >= 2 * initialBalance) {
        console.log('Balance doubled. Stopping transactions.');
        return 'STOP';
    }
    if (currentBalance <= 4.4) {
        console.log('Balance dropped below 4.4 SOL. Stopping transactions.');
        return 'STOP';
    }
    return 'CONTINUE';
}

// Place a buy order
async function placeBuyOrder(amount, price, currency) {
    return await retryWithBackoff(async () => {
        const lamports = BigInt(Math.round(amount * LAMPORTS_PER_SOL));
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: new PublicKey('#'), // Replace with actual recipient address
                lamports,
            })
        );
        const signature = await limiter.schedule(() =>
            sendAndConfirmTransaction(connection, transaction, [keypair])
        );
        console.log(`Buy order placed: ${amount} ${currency} at ${price} USD`);
        return signature;
    });
}

// Place a sell order
async function placeSellOrder(amount, price, currency) {
    return await retryWithBackoff(async () => {
        const lamports = BigInt(Math.round(amount * LAMPORTS_PER_SOL));
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: new PublicKey('#'), // Replace with actual recipient address
                lamports,
            })
        );
        const signature = await limiter.schedule(() =>
            sendAndConfirmTransaction(connection, transaction, [keypair])
        );
        console.log(`Sell order placed: ${amount} ${currency} at ${price} USD`);
        return signature;
    });
}

// Process transaction opportunities
async function processTransactions(transactions) {
    for (const trade of transactions) {
        const { Amount, Price, Currency, PriceInUSD } = trade.Trade;

        const buyCost = Amount * Price * LAMPORTS_PER_SOL;
        const sellRevenue = Amount * PriceInUSD * LAMPORTS_PER_SOL;
        const netProfit = sellRevenue - buyCost - (2 * FIXED_TRANSACTION_FEE_SOL); // Corrected fee calculation

        if (netProfit > 0 && (sellRevenue / buyCost - 1) >= SLIPPAGE_TOLERANCE) {
            console.log(`Profitable trade identified: ${netProfit.toFixed(6)} SOL`);
            await placeBuyOrder(Amount, Price, Currency);
            await placeSellOrder(Amount, PriceInUSD, Currency);
        }
    }
}

// WebSocket subscription
async function subscribeToTransactions() {
    console.log('Subscribing to transaction feed...');
    client.subscribe(
        {
            query: `
                subscription {
                    Solana {
                        General: DEXTradeByTokens {
                            Block { Time }
                            Trade { Amount Price Currency { Symbol } PriceInUSD }
                        }
                    }
                }
            `,
        },
        {
            next: async (response) => {
                const condition = await checkBalanceConditions();
                if (condition === 'STOP') {
                    client.dispose();
                    return;
                }

                const transactions = response.data?.Solana.General || [];
                const largeTransactions = transactions.filter(
                    trade => trade.Trade.PriceInUSD >= LARGE_TRANSACTION_THRESHOLD_USD
                );

                if (largeTransactions.length > 0) {
                    console.log('Processing large transactions...');
                    await processTransactions(largeTransactions);
                }
            },
            error: (err) => console.error('Subscription error:', err),
            complete: () => console.log('Subscription complete'),
        }
    );
}

// Start server and subscription
app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    await initializeBalance();
    await subscribeToTransactions();
});
