import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { urlSinIssDeDiscord } from "@/lib/authIss";

export const { POST } = handlers;

/** Ver lib/authIss.ts: la vuelta de Discord llega con un `iss` que Auth.js no espera. */
export function GET(req: NextRequest) {
  const limpia = urlSinIssDeDiscord(new URL(req.url));
  return handlers.GET(limpia ? new NextRequest(limpia, { headers: req.headers }) : req);
}
