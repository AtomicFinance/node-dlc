#!/usr/bin/env node

import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { Application } from "express";

import Server from "./server";

const app: Application = express();
const server: Server = new Server(app);
let port: number = 8585;

process.title = "dlcd";

if (process.argv.indexOf("--help") !== -1
    || process.argv.indexOf("-h") !== -1) {
  console.error("See the dlcd docs at: https://github.com/atomicfinance/node-dlc.");
  process.exit(1);
  throw new Error("Could not exit.");
}

if (process.argv.indexOf("--version") !== -1
    || process.argv.indexOf("-v") !== -1) {
  const pkg = require("../package.json");
  console.log(pkg.version);
  process.exit(0);
  throw new Error("Could not exit.");
}

if (process.argv.indexOf("--port") !== -1
    || process.argv.indexOf("-p") !== -1) {
  const shortForm = process.argv.indexOf("-p") !== -1;
  try {
    port = Number(process.argv[process.argv.indexOf(shortForm ? "-p" : "--port") + 1]);
  } catch (e) {
    throw new Error(e);
  }
}

app.listen(port, "localhost", function(err: any) {
  if (err) return err;
  console.info(`Server running on : http://localhost:${port}`);
});
