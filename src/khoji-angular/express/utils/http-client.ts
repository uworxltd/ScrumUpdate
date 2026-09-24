import https from 'https';
import querystring from 'querystring';
import { getLogger } from './logger';
const logger = getLogger('HttpClient');

export interface HttpsGetResponse {
  status: number;
  data: any;
  headers: any;
}

export interface HttpsPostResponse {
  status: number;
  data: any;
}

/**
 * HTTP Client class for making HTTPS requests
 */
export class HttpClient {
  /**
   * Make HTTPS GET request
   */
  static get(hostname: string, pathname: string, authToken: string): Promise<HttpsGetResponse> {
    return new Promise((resolve, reject) => {
      logger.debug(`GET ${hostname}${pathname} auth=${authToken ? 'present' : 'absent'}`);
      const options: https.RequestOptions = {
        hostname: hostname,
        path: pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            logger.debug(`GET ${hostname}${pathname} status=${res.statusCode} bodyType=json`);
            resolve({
              status: res.statusCode || 500,
              data: parsedData,
              headers: res.headers
            });
          } catch (e) {
            logger.debug(`GET ${hostname}${pathname} status=${res.statusCode} non-json-response length=${responseData.length}`);
            resolve({
              status: res.statusCode || 500,
              data: responseData,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', (e) => {
        logger.error(`GET ${hostname}${pathname} error: ${e.message || e}`);
        reject(e);
      });

      req.end();
    });
  }

  /**
   * Make HTTPS POST request
   */
  static post(hostname: string, pathname: string, data: Record<string, string>): Promise<HttpsPostResponse> {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify(data);
      logger.debug(`POST ${hostname}${pathname} payloadKeys=${Object.keys(data).join(',')}`);

      const options: https.RequestOptions = {
        hostname: hostname,
        path: pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            logger.debug(`POST ${hostname}${pathname} status=${res.statusCode} bodyType=json`);
            resolve({
              status: res.statusCode || 500,
              data: parsedData
            });
          } catch (e) {
            logger.error(`POST ${hostname}${pathname} failed to parse JSON response length=${responseData.length}`);
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });

      req.on('error', (e) => {
        logger.error(`POST ${hostname}${pathname} error: ${e.message || e}`);
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  }
}
