import connectDB from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await connectDB();

    return successResponse("ScrapWala API is healthy", {
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return errorResponse("Database connection failed", [message], 503);
  }
}
