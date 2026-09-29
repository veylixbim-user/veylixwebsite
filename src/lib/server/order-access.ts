import "server-only";
import { cookies } from "next/headers";

/**
 * The order link (…/order/ID?t=TOKEN) is the customer's only credential for their order. It is also kept in a cookie
 * in the browser that placed the order, so coming back from the payment page — which the browser reaches by a
 * plain redirect — works without the token ever being handed to the payment processor.
 */
const cookieName = (orderId: string) => `vx_o_${orderId.replace(/[^A-Za-z0-9]/g, "")}`.slice(0, 60);

export async function rememberOrderToken(orderId: string, token: string) {
  (await cookies()).set(cookieName(orderId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 86_400,
  });
}

export async function storedOrderToken(orderId: string): Promise<string> {
  return (await cookies()).get(cookieName(orderId))?.value ?? "";
}
