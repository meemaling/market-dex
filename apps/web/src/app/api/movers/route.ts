import { NextResponse } from "next/server";
import { getMovers } from "@market-dex/db";

export async function GET() {
  const movers = await getMovers();
  return NextResponse.json(movers);
}
