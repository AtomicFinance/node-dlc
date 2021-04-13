import { Logger } from '@node-dlc/logger';
import axios, {
  AxiosBasicCredentials,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

export type Method =
  | 'get'
  | 'GET'
  | 'delete'
  | 'DELETE'
  | 'head'
  | 'HEAD'
  | 'options'
  | 'OPTIONS'
  | 'post'
  | 'POST'
  | 'put'
  | 'PUT'
  | 'patch'
  | 'PATCH'
  | 'purge'
  | 'PURGE'
  | 'link'
  | 'LINK'
  | 'unlink'
  | 'UNLINK';

export type ApiPrefix = 'api' | 'api/v0';

export default class DlcdClient {
  public host: string;

  public port: number;

  public ssl: boolean;

  public apiKey: string;

  public logger: Logger;

  public apiPrefix: ApiPrefix;

  constructor(
    host: string,
    port: number,
    logger: Logger,
    apiKey = '',
    apiPrefix: ApiPrefix = 'api',
    ssl = false,
  ) {
    this.host = host;
    this.port = port;
    this.logger = logger;
    this.ssl = ssl;
    this.apiKey = apiKey;
    this.apiPrefix = apiPrefix;
  }

  public async request(
    method: Method,
    endpoint: string,
    params: IParams = {},
    data: IParams = {},
  ): Promise<any> {
    const config: AxiosRequestConfig = {
      baseURL: `${this.ssl ? 'https' : 'http'}://${this.host}:${this.port}/${
        this.apiPrefix
      }/`,
      url: endpoint,
      timeout: 1000,
      method,
      params,
      data,
      responseType: 'json',
    };

    if (this.apiKey) {
      const auth: AxiosBasicCredentials = {
        username: 'admin',
        password: this.apiKey,
      };

      config.auth = auth;
      config.timeout = 5000;
    }

    return axios(config)
      .then((response: AxiosResponse) => response.data)
      .catch(this.handleError);
  }

  public get(endpoint: string, params: IParams = {}): any {
    return this.request('GET', endpoint, params);
  }

  public post(endpoint: string, params: IParams = {}): any {
    return this.request('POST', endpoint, {}, params);
  }

  public put(endpoint: string, params: IParams = {}): any {
    return this.request('PUT', endpoint, {}, params);
  }

  public handleError = (error: AxiosError): void => {
    if (error.response) {
      if (error.response.data.error) {
        this.logger.error(`Error: ${error.response.data.error}`);
        process.exit(1);
      } else {
        this.logger.log(error.response.status);
        this.logger.log(error.response.headers);
        throw new Error(error.response.data);
      }
    } else if (error.code === 'ECONNREFUSED') {
      this.logger.error(
        `Error: Could not connect to DLCd server ${this.host}:${this.port}`,
      );
      this.logger.error(
        'Make sure the DLCd server is running and that you are connecting to the correct port',
      );
      process.exit(1);
    } else if (error.code === 'EPIPE') {
      process.exit(0);
    } else {
      this.logger.log(error.message);
      throw new Error(error.message);
    }
  };
}

interface IParams {
  [x: string]: unknown;
}
