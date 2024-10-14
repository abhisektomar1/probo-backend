import express from "express";
import { createStockBalance, INR_BALANCES, STOCK_BALANCES } from "../dataStore.js";
const router = express.Router();



  
router.post("/mint", (req, res) => {
    const { userId, stockSymbol, quantity, price } = req.body;
  
    // Check if user exists
    if (!INR_BALANCES[userId]) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }
  
    // Calculate the total cost for both 'yes' and 'no' tokens
    const totalCost = quantity * price * 2; // Cost for both 'yes' and 'no'
    const userBalance = INR_BALANCES[userId].balance;
  
    // Check if user has sufficient balance
    if (userBalance < totalCost) {
      return res.status(400).json({
        message: `Insufficient balance. You need ${totalCost} but only have ${userBalance}`,
      });
    }
  
    // Deduct the cost from user's balance
    INR_BALANCES[userId].balance -= totalCost;
  
    // Ensure the user has stock balances initialized for this stock symbol
    createStockBalance(userId, stockSymbol);
  
    // Mint the 'yes' and 'no' tokens
    STOCK_BALANCES[userId][stockSymbol].yes.quantity += quantity;
    STOCK_BALANCES[userId][stockSymbol].no.quantity += quantity;
  
    // Return success response with the updated balance
    res.status(200).json({
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${INR_BALANCES[userId].balance}`,
    });
  });
  
export default router;
