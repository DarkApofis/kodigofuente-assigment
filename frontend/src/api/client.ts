const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  message?: string | string[];
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  if (!response.ok) {
    // The backend returns a consistent { statusCode, message, error, ... } body
    let message = `Error ${response.status}`;
    try {
      const body = (await response.json()) as ErrorBody;
      if (Array.isArray(body.message)) message = body.message.join('. ');
      else if (typeof body.message === 'string') message = body.message;
    } catch {
      // Non-JSON error body: keep the generic message
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado';
}
