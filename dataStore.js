// dataStore.js
export let INR_BALANCES = {}; 
export let ORDERBOOK = {};
export let STOCK_BALANCES = {};
// Function to create a user
export function createUser(userId) {
    if (!INR_BALANCES[userId]) {
        INR_BALANCES[userId] = { balance: 0, locked: 0 };
    }
}

export function createSymbol(stockSymbol) {
    if (!ORDERBOOK[stockSymbol]) {
        ORDERBOOK[stockSymbol] = { yes: {}, no: {} };
    }
}

export function createStockBalance(userId, stockSymbol) {
    // Check if the user has a stock balance entry
    if (!STOCK_BALANCES[userId]) {
      STOCK_BALANCES[userId] = {};
    }
  
    // Check if the stock symbol entry exists for the user
    if (!STOCK_BALANCES[userId][stockSymbol]) {
      STOCK_BALANCES[userId][stockSymbol] = {
        yes: { quantity: 0, locked: 0 }, // Initialize 'yes' with object
        no: { quantity: 0, locked: 0 },  // Initialize 'no' with object
      };
    }
  }

