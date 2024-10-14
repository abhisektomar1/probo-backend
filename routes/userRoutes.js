// routes/userRoutes.js
import express from 'express';
import { INR_BALANCES, createUser } from '../dataStore.js'; // Import shared state and function

const  router = express.Router();

// Create User
router.post('/create/:userId', (req, res) => {
    const { userId } = req.params;
    createUser(userId);
    res.status(201).json({ message: `User ${userId} created` });
});



export default router; // Export the router
