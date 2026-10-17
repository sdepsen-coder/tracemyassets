import type { BillingConfig } from "@/lib/api";

/**
 * Paddle's checkout (Paddle.js). Paddle is the seller: it takes the
 * payment and the tax. This file only opens its overlay for a price we
 * name; what the person gets is decided by the signed webhook on the
 * server, never by the browser.
 */

const PADDLE_SCRIPT = "https://cdn.paddle.com/paddle/v2/paddle.js";

type PaddleGlobal = {
  Environment: { set: (environment: "sandbox" | "production") => void };
  Initialize: (options: { token: string }) => void;
  Checkout: { open: (options: Record<string, unknown>) => void };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

let ready: Promise<PaddleGlobal> | null = null;

function loadPaddle(config: BillingConfig): Promise<PaddleGlobal> {
  if (ready) return ready;

  ready = new Promise<PaddleGlobal>((resolve, reject) => {
    function start() {
      const paddle = window.Paddle;

      if (!paddle) {
        reject(new Error("Paddle did not load."));
        return;
      }

      // The server says "production"; older servers said "live".
      if (config.environment !== "production" && config.environment !== "live") {
        paddle.Environment.set("sandbox");
      }

      paddle.Initialize({ token: config.client_token });
      resolve(paddle);
    }

    if (window.Paddle) {
      start();
      return;
    }

    const script = document.createElement("script");
    script.src = PADDLE_SCRIPT;
    script.async = true;
    script.onload = start;
    script.onerror = () => reject(new Error("Paddle did not load."));
    document.head.appendChild(script);
  });

  // A failed load can be tried again on the next click.
  ready.catch(() => {
    ready = null;
  });

  return ready;
}

export type PaidPlan = "Pro" | "Extra";
export type Interval = "month" | "year";

export async function startCheckout(
  config: BillingConfig,
  plan: PaidPlan,
  interval: Interval,
  who: { user_id: number; email: string },
): Promise<void> {
  const priceId = config.prices[plan]?.[interval];

  if (!priceId) {
    throw new Error("This plan is not available right now.");
  }

  const paddle = await loadPaddle(config);

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: who.email },
    customData: { user_id: String(who.user_id) },
    settings: {
      displayMode: "overlay",
      allowLogout: false,
      successUrl: `${window.location.origin}/account?checkout=success`,
    },
  });
}

/** Open the checkout for a one-time Deep scan credit pack. */
export async function startPackCheckout(
  config: BillingConfig,
  priceId: string,
  who: { user_id: number; email: string },
): Promise<void> {
  if (!config.packs.some((pack) => pack.price_id === priceId)) {
    throw new Error("This credit pack is not available right now.");
  }

  const paddle = await loadPaddle(config);

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: who.email },
    customData: { user_id: String(who.user_id) },
    settings: {
      displayMode: "overlay",
      allowLogout: false,
      successUrl: `${window.location.origin}/account?credits=success`,
    },
  });
}
