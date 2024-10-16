import express from "express";
import {  INR_BALANCES, ORDERBOOK, STOCK_BALANCES } from "../dataStore.js";
import { app } from "../index.js";
const router = express.Router();

router.post("/sell", (req, res) => {
  const { userId, stockSymbol, quantity, price, stockType } = req.body;

  if (!STOCK_BALANCES[userId] || !STOCK_BALANCES[userId][stockSymbol]) {
    return res
      .status(404)
      .json({ message: `User ${userId} or stock ${stockSymbol} not found` });
  }

  if (!["yes", "no"].includes(stockType)) {
    return res
      .status(400)
      .json({ message: "Invalid stock type. Must be 'yes' or 'no'." });
  }

  const userStock = STOCK_BALANCES[userId][stockSymbol][stockType];

  if (userStock.quantity < quantity) {
    return res.status(400).json({
      message: `Insufficient stock balance`,
    });
  }

  userStock.quantity -= quantity;
  userStock.locked += quantity;

  if (!ORDERBOOK[stockSymbol]) {
    ORDERBOOK[stockSymbol] = { yes: {}, no: {} };
  }

  if (!ORDERBOOK[stockSymbol][stockType][price]) {
    ORDERBOOK[stockSymbol][stockType][price] = { total: 0, orders: {} };
  }

  const orderbookEntry = ORDERBOOK[stockSymbol][stockType][price];
  orderbookEntry.total += quantity;

  if (!orderbookEntry.orders[userId]) {
    orderbookEntry.orders[userId] = 0;
  }

  orderbookEntry.orders[userId] += quantity;

  res.status(200).json({
    message: `Sell order placed for ${quantity} '${stockType}' options at price ${price}.`,
  });
});



router.post("/buy", (req, res) => {
  const { userId, stockSymbol, quantity, price, stockType } = req.body;

  // Ensure the user has sufficient funds for the total buy
  const totalCost = quantity * price;
  if (INR_BALANCES[userId].balance < totalCost) {
    return res.status(400).json({ message: "Insufficient INR balance" });
  }

  // Get the current orders for the given stock type ('yes' or 'no')
  const stockOrderBook = ORDERBOOK[stockSymbol][stockType];

  let remainingQuantity = quantity; // Track the remaining quantity to be matched
  let totalMatchedCost = 0; // Total cost of the matched orders
  let matchedOrders = [];

  // Try to match with the lowest sell orders (best price for buyer)
  const sortedSellPrices = Object.keys(stockOrderBook).map(Number).sort((a, b) => a - b);

  for (const sellPrice of sortedSellPrices) {
    if (sellPrice > price || remainingQuantity === 0) {
      break; // No more matching, either sell price is higher than our buy price or we're done
    }

    const sellOrders = stockOrderBook[sellPrice];

    // For each sell order at this price, try to match as much as possible
    for (const sellerId in sellOrders.orders) {
      const sellQuantity = sellOrders.orders[sellerId];

      if (sellQuantity <= remainingQuantity) {
        // Fully match this sell order
        remainingQuantity -= sellQuantity;
        totalMatchedCost += sellQuantity * sellPrice;
        matchedOrders.push({ sellerId, quantity: sellQuantity, price: sellPrice });

        // Update seller's stock balance, release locked stock and update INR balances
        STOCK_BALANCES[sellerId][stockSymbol][stockType].quantity += sellQuantity; // Release to seller
        STOCK_BALANCES[sellerId][stockSymbol][stockType].locked -= sellQuantity;
        INR_BALANCES[sellerId].balance += sellQuantity * sellPrice; // Release INR back to seller

        delete sellOrders.orders[sellerId];
      } else {
        // Partially match this sell order
        totalMatchedCost += remainingQuantity * sellPrice;
        matchedOrders.push({ sellerId, quantity: remainingQuantity, price: sellPrice });

        // Update the sell order to reflect the remaining quantity
        sellOrders.orders[sellerId] -= remainingQuantity;
        STOCK_BALANCES[sellerId][stockSymbol][stockType].quantity += remainingQuantity; // Release locked tokens
        STOCK_BALANCES[sellerId][stockSymbol][stockType].locked -= remainingQuantity;

        remainingQuantity = 0;
        break;
      }
    }

    // Remove the price level from the order book if all orders are matched
    if (Object.keys(sellOrders.orders).length === 0) {
      delete stockOrderBook[sellPrice];
    }

    if (remainingQuantity === 0) {
      break; // Stop if all the buy order has been matched
    }
  }

  // Update the buyer's balance and stock holdings after matching
  INR_BALANCES[userId].balance -= totalMatchedCost; // Deduct the matched amount
  STOCK_BALANCES[userId][stockSymbol][stockType].quantity += (quantity - remainingQuantity); // Add matched quantity to buyer

  if (remainingQuantity > 0) {
    // If there is still some quantity left, add it to the order book as a pending order
    if (!stockOrderBook[price]) {
      stockOrderBook[price] = { total: 0, orders: {} };
    }
    stockOrderBook[price].total += remainingQuantity;
    stockOrderBook[price].orders[userId] = remainingQuantity;

    // Lock the buyer's INR balance for the remaining quantity
    INR_BALANCES[userId].locked += remainingQuantity * price;

    return res.status(200).json({
      message: `Buy order placed and pending`,
    });
  } else if (quantity > remainingQuantity) {
    // Partial match occurred
    return res.status(200).json({
      message: `Buy order matched partially, ${remainingQuantity} remaining`,
    });
  } else {
    // Fully matched
    return res.status(200).json({
      message: `Buy order matched at best price ${price}`,
    });
  }
});

  
  

export default router;
