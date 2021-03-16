#!/usr/bin/env node

process.title = "dlccli";

import Config from "bcfg";
import yargs from "yargs/yargs";
import { parseConfig } from "./utils/config";

const config = new Config("node-dlc");
config.open("node-dlc.conf"); // TODO: allow users to pass in their on conf directory

type Network = "mainnet" | "testnet" | "regtest";
const networks: ReadonlyArray<Network> = ["mainnet", "testnet", "regtest"];

type Log = "trace" | "debug" | "info" | "warn" | "error";
const logs: ReadonlyArray<Log> = ["trace", "debug", "info", "warn", "error"];

// TODO allow user to pass in api-key on startup

const argv: IArguments = yargs(process.argv.slice(2))
  .usage("Usage:   dlccli [options]             start DLCd")
  .scriptName("dlccli")
  .config(parseConfig(config.data))
  .commandDir("cmds", { recurse: true })
  .options({
    p: { alias: "port", type: "number", default: 8575, global: true },
    n: { alias: "network", type: "string", default: "mainnet", choices: networks, global: true },
    h: { alias: "host", type: "string", default: "127.0.0.1", global: true },
    l: { alias: "loglevel", type: "string", default: "info", choices: logs, global: true }
  })
  .check((_argv, _) => {
    const { port } = _argv;
    if (isNaN(port)) {
      throw new Error("Port must be a number");
    }
    return true;
  })
  .argv;

interface IArguments {
  [x: string]: unknown;
  apiKey: string;
  network: Network;
  port: number;
  host: string;
  loglevel: string;
}
