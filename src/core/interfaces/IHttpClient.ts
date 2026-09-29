/** Port: HTTP transport used by repository implementations. */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface HttpRequest {
  readonly method: HttpMethod;
  /** Path relative to the API base URL, e.g. `/shifts`. */
  readonly path: string;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

export interface HttpResponse<T> {
  readonly status: number;
  readonly data: T;
}

export interface IHttpClient {
  request<T>(request: HttpRequest): Promise<HttpResponse<T>>;
}
