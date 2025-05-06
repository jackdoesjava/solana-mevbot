# Solana Sandwich MEV Bot - Devnet

This project is a **Solana-based MEV bot** designed to identify and exploit sandwich trading opportunities on the **Solana Devnet**. The bot uses a minimum extractable value (MEV) strategy, detecting opportunities where transactions can be executed between two trades to capture the price difference for profit. 

The bot is optimized for real-time execution on the **Solana blockchain** and allows users to automate sandwich trades, while providing a foundation for further development of custom MEV strategies.

---

## 🚀 Features

- **Sandwich Trading Strategy**: Detects and executes sandwich trades to profit from price slippage.
- **Solana Devnet**: Built to run on the Solana Devnet, ideal for testing and experimentation.
- **Real-time Execution**: Monitors the Solana network for sandwich opportunities and executes trades instantly.
- **Customizable Settings**: Adjust parameters for gas price, trade size, slippage tolerance, and other settings.
- **Logging and Monitoring**: Logs all detected opportunities and executed trades for analysis.

---

## 🧑‍💻 Setup & Installation

### Prerequisites

Before you start, you need to have the following installed:
- **Solana CLI**: To interact with the Solana blockchain.
- **Rust**: Solana is built with Rust, so you will need it for building and compiling any Rust-based Solana programs.
- **Node.js**: Required to interact with the bot's JavaScript components.
- **Solana Wallet**: Set up your wallet for connecting to Devnet.

### Steps to Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/slendergamer33/solana-mevbot.git
