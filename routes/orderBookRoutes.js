import express from "express";
import { createStockBalance, INR_BALANCES, ORDERBOOK, STOCK_BALANCES } from "../dataStore.js";
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
      message: `Insufficient ${stockType} stock. You have ${userStock.quantity} but are trying to sell ${quantity}.`,
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

  if (!INR_BALANCES[userId]) {
    return res.status(404).json({ message: `User ${userId} not found` });
  }

  if (!ORDERBOOK[stockSymbol] || !ORDERBOOK[stockSymbol][stockType][price]) {
    return res
      .status(400)
      .json({
        message: `No sell orders available at this price for ${stockType} options`,
      });
  }

  const availableSellOrders = ORDERBOOK[stockSymbol][stockType][price];
  let totalCost = quantity * price;

  if (INR_BALANCES[userId].balance < totalCost) {
    return res.status(400).json({
      message: `Insufficient balance. You need ${totalCost} but only have ${INR_BALANCES[userId].balance}`,
    });
  }

  let remainingQuantity = quantity;

  for (const sellerId in availableSellOrders.orders) {
    const sellerQuantity = availableSellOrders.orders[sellerId];

    if (sellerQuantity >= remainingQuantity) {
      availableSellOrders.orders[sellerId] -= remainingQuantity;

      if (availableSellOrders.orders[sellerId] === 0) {
        delete availableSellOrders.orders[sellerId];
      }

      availableSellOrders.total -= remainingQuantity;

      INR_BALANCES[userId].balance -= remainingQuantity * price;
      INR_BALANCES[sellerId].balance += remainingQuantity * price;

      createStockBalance(userId, stockSymbol);
      STOCK_BALANCES[userId][stockSymbol][stockType].quantity +=
        remainingQuantity;

      STOCK_BALANCES[sellerId][stockSymbol][stockType].locked -=
        remainingQuantity;

      return res.status(200).json({
        message: "Buy order placed and trade executed",
      });
    } else {
      remainingQuantity -= sellerQuantity;

      INR_BALANCES[userId].balance -= sellerQuantity * price;
      INR_BALANCES[sellerId].balance += sellerQuantity * price;

      createStockBalance(userId, stockSymbol);
      STOCK_BALANCES[userId][stockSymbol][stockType].quantity += sellerQuantity;

      STOCK_BALANCES[sellerId][stockSymbol][stockType].locked -= sellerQuantity;

      delete availableSellOrders.orders[sellerId];
    }
  }

  if (remainingQuantity > 0) {
    return res.status(400).json({
      message: `Only partial order filled, ${remainingQuantity} still pending`,
    });
  }
});

export default router;
