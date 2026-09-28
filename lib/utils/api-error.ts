export class ApiError extends Error {
  statusCode: number;
  code: string;
  details: unknown[];

  constructor(
    statusCode: number,
    message: string,
    code: string = "ERROR",
    details: unknown[] = []
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function handleApiError(error: unknown): {
  status: number;
  body: { success: false; message: string; errors: unknown[] };
} {
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        message: error.message,
        errors: error.details,
      },
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        success: false,
        message: "Internal server error",
        errors: [error.message],
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      message: "Internal server error",
      errors: [],
    },
  };
}
