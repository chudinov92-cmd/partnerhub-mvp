import { NextResponse } from "next/server";
import { getPublicClientIp } from "@/lib/geoip/getClientIp";
import { lookupZeipCityByIp } from "@/lib/geoip/lookupCityByIp";

export const runtime = "nodejs";

/** Определяет город пользователя по IP (self-hosted GeoLite2). Без PII в ответе. */
export async function GET(req: Request) {
  const ip = getPublicClientIp(req);
  if (!ip) {
    return NextResponse.json({ city: null });
  }

  try {
    const city = await lookupZeipCityByIp(ip);
    return NextResponse.json(
      { city },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ city: null });
  }
}
