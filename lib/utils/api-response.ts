import { NextResponse } from "next/server";

export function successResponse(
  messageOrData: string | Record<string, unknown>,
  data?: unknown,
  status: number = 200
) {
  if (typeof messageOrData === "string") {
    return NextResponse.json(
      { success: true, message: messageOrData, data },
      { status }
    );
  }
  return NextResponse.json(
    { success: true, ...messageOrData },
    { status }
  );
}

export function errorResponse(
  message: string,
  errorsOrStatus?: unknown[] | number,
  status?: number
) {
  if (typeof errorsOrStatus === "number") {
    return NextResponse.json(
      { success: false, message, errors: [] },
      { status: errorsOrStatus }
    );
  }
  return NextResponse.json(
    { success: false, message, errors: errorsOrStatus || [] },
    { status: status || 500 }
  );
}
