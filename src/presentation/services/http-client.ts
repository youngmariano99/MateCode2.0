import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  CancelTokenSource,
} from "axios";
import { ErrorBase } from "../../domain/errores/error-base";

export class ApiError extends ErrorBase {
  public readonly codigo: string;

  constructor(
    public readonly status: number,
    mensaje: string,
    codigo: string = "API_ERROR",
    metadata?: Record<string, unknown>
  ) {
    super(mensaje, metadata);
    this.codigo = codigo;
  }
}

class HttpClientWrapper {
  private readonly instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isCancel(error)) {
          return Promise.reject(
            new ApiError(
              499,
              "Operación cancelada por el usuario",
              "REQUEST_CANCELLED"
            )
          );
        }

        if (error.response) {
          const status = error.response.status;
          const msg =
            error.response.data?.mensaje ||
            "Ocurrió un error al procesar tu solicitud.";
          const code = error.response.data?.codigo || "HTTP_ERROR";
          return Promise.reject(new ApiError(status, msg, code));
        }

        if (error.request) {
          return Promise.reject(
            new ApiError(
              503,
              "No pudimos conectar con el servidor. Revisá tu conexión a Internet.",
              "NETWORK_ERROR"
            )
          );
        }

        return Promise.reject(
          new ApiError(500, error.message, "REQUEST_ERROR")
        );
      }
    );
  }

  public crearCancelToken(): CancelTokenSource {
    return axios.CancelToken.source();
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.get<T>(url, config);
    return res.data;
  }

  public async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const res = await this.instance.post<T>(url, data, config);
    return res.data;
  }

  public async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const res = await this.instance.put<T>(url, data, config);
    return res.data;
  }

  public async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const res = await this.instance.patch<T>(url, data, config);
    return res.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.delete<T>(url, config);
    return res.data;
  }
}

export const HttpClient = new HttpClientWrapper();
