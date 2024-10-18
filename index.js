
  import express from 'express';
  import bodyParser from 'body-parser';
  import userRoutes from './routes/userRoutes.js';
  import orderBookRoutes from './routes/orderBookRoutes.js';
  import mintingRoutes from './routes/mintingRoute.js';

  import { INR_BALANCES, createUser, createSymbol, ORDERBOOK, STOCK_BALANCES } from './dataStore.js'; 

  export const app = express();
  const port = 3000;

  app.use(bodyParser.json());

  app.use('/user', userRoutes);
  app.use('/order', orderBookRoutes);
  app.use('/trade', mintingRoutes);

  app.get('/', (req, res) => {
      res.send('Welcome to the Probo app');
  });

  app.post('/onramp/inr', (req, res) => {
      const { userId, amount } = req.body;
      createUser(userId); 
      INR_BALANCES[userId].balance += amount;
      res.status(200).json({ message: `Onramped ${userId} with amount ${amount}` });
  });

  app.post('/symbol/create/:stockSymbol', (req, res) => {
      const { stockSymbol } = req.params;
      createSymbol(stockSymbol);
      res.status(201).json({ message: `Symbol ${stockSymbol} created` });
  });

  app.post('/reset', (req, res) => {
      INR_BALANCES = {};
      ORDERBOOK = {};
      STOCK_BALANCES = {};
      res.status(200).json({ message: "Data reset successful" });
    });

    
  app.get('/balances/inr', (req, res) => {
      // if (!INR_BALANCES[userId]) {
      //     return res.status(404).json({ message: 'User not found' });
      // }
      res.status(200).json(INR_BALANCES);
  });

  app.get("/balances/stock", (req, res) => {
      res.status(200).json(STOCK_BALANCES);
    });

    app.get("/orderbook", (req, res) => {
      res.status(200).json(ORDERBOOK);
    });

  app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
  });

  //need to make a perfect version now