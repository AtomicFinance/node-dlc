import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { Application } from 'express';

import Server from './server'

const app: Application = express();
const server: Server = new Server(app);
const port: number = parseInt(process.env.port, 10) || 8585;

app.listen(port, 'localhost', function(err: any) {
  if (err) return err;
  console.info(`Server running on : http://localhost:${port}`);
});
