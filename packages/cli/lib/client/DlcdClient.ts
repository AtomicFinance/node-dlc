import { Logger } from "@node-dlc/logger";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

export type Method =
  | "get" | "GET"
  | "delete" | "DELETE"
  | "head" | "HEAD"
  | "options" | "OPTIONS"
  | "post" | "POST"
  | "put" | "PUT"
  | "patch" | "PATCH"
  | "purge" | "PURGE"
  | "link" | "LINK"
  | "unlink" | "UNLINK";

export type ApiVersion = "v1";

export default class DlcdClient {

  public host: string;

  public port: number;

  public ssl: boolean;

  public apiKey: string;

  public logger: Logger;

  public apiVersion: ApiVersion;
  constructor(host: string, port: number, logger: Logger, apiKey: string = "", apiVersion: ApiVersion = "v1", ssl: boolean = false) {
    this.host = host;
    this.port = port;
    this.logger = logger;
    this.ssl = ssl;
    this.apiKey = apiKey;
    this.apiVersion = apiVersion;
  }

  public async request(method: Method, endpoint: string, params: IParams = {}): Promise<any> {
    if (this.apiKey) params.apikey = this.apiKey;

    const config: AxiosRequestConfig = {
      baseURL: `${this.ssl ? "https" : "http"}://${this.host}:${this.port}/${this.apiVersion}/`,
      url: endpoint,
      timeout: 1000,
      method,
      params,
      responseType: "json"
    };

    return axios(config)
      .then((response: AxiosResponse) => response.data)
      .catch(this.handleError);
  }

  public get(endpoint: string, params: IParams = {}) {
    return this.request("GET", endpoint, params);
  }

  public post(endpoint: string, params: IParams = {}) {
    return this.request("POST", endpoint, params);
  }

  public put(endpoint: string, params: IParams = {}) {
    return this.request("PUT", endpoint, params);
  }

  public handleError = (error: AxiosError) => {
    if (error.response) {
      if (error.response.data.msg) {
        this.logger.log(`Error: ${error.response.data.msg}`);
        process.exit(1);
      } else {
        this.logger.log(error.response.status);
        this.logger.log(error.response.headers);
        throw new Error(error.response.data);
      }
    } else if (error.code === "ECONNREFUSED") {
      this.logger.error(`Error: Could not connect to DLCd server ${this.host}:${this.port}`);
      this.logger.error("Make sure the DLCd server is running and that you are connecting to the correct port");
      process.exit(1);
    } else {
      this.logger.log(error.message);
      throw new Error(error.message);
    }
  }
}

interface IParams {
  apikey?: string;
  [x: string]: unknown;
}
