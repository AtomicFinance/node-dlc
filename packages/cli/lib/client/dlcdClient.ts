import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

export type Method =
  | 'get' | 'GET'
  | 'delete' | 'DELETE'
  | 'head' | 'HEAD'
  | 'options' | 'OPTIONS'
  | 'post' | 'POST'
  | 'put' | 'PUT'
  | 'patch' | 'PATCH'
  | 'purge' | 'PURGE'
  | 'link' | 'LINK'
  | 'unlink' | 'UNLINK'

export type ApiVersion = 'v1'

export default class DlcdClient {
  constructor(host: string, port: number, apiKey: string, ssl: boolean = false, apiVersion: ApiVersion = 'v1') {
    this.host = host
    this.port = port
    this.ssl = ssl
    this.apiKey = apiKey
    this.apiVersion = apiVersion
  }

  host: string;

  port: number;

  ssl: boolean;

  apiKey: string;

  apiVersion: ApiVersion;

  async request(method: Method, endpoint: string, params): Promise<any> {
    const config: AxiosRequestConfig = {
      baseURL: `${this.ssl ? 'https' : 'http'}://${this.host}:${this.port}/${this.apiVersion}/`,
      url: endpoint,
      timeout: 1000,
      method,
      params,
      responseType: 'json'
    }

    return axios(config)
      .then((response: AxiosResponse) => response.data)
      .catch(this.handleError)
  }

  get(endpoint: string, params) {
    return this.request('GET', endpoint, params)
  }

  post(endpoint: string, params) {
    return this.request('POST', endpoint, params)
  }

  put(endpoint: string, params) {
    return this.request('PUT', endpoint, params)
  }

  handleError = (error: AxiosError) => {
    if (error.response) {
      if (error.response.data.msg) {
        console.error(`Error: ${error.response.data.msg}`)
        process.exit(1)
      } else {
        console.log(error.response.status);
        console.log(error.response.headers);
        throw new Error(error.response.data)
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`Error: Could not connect to DLCd server ${this.host}:${this.port}`)
      console.error('Make sure the DLCd server is running and that you are connecting to the correct port')
      process.exit(1)
    } else {
      console.log('error.message')
      console.log(error.message);
      throw new Error(error.message)
    }
  };  
}
