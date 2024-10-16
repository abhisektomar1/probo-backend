import express from "express";
import { createStockBalance, INR_BALANCES, STOCK_BALANCES } from "../dataStore.js";
const router = express.Router();



  
router.post("/mint", (req, res) => {
    const { userId, stockSymbol, quantity, price } = req.body;
  
    if (!INR_BALANCES[userId]) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }
  
    const totalCost = quantity * price; 
    const userBalance = INR_BALANCES[userId].balance;
  
    if (userBalance < totalCost) {
      return res.status(400).json({
        message: `Insufficient balance. You need ${totalCost} but only have ${userBalance}`,
      });
    }
  
    INR_BALANCES[userId].balance -= totalCost;
  
    createStockBalance(userId, stockSymbol);
  
    STOCK_BALANCES[userId][stockSymbol].yes.quantity += quantity;
    STOCK_BALANCES[userId][stockSymbol].no.quantity += quantity;
  
    res.status(200).json({
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${INR_BALANCES[userId].balance}`,
    });
  });
  
export default router;
