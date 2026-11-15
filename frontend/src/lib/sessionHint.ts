"use client";

import { useEffect, useState } from "react";

/**
 * A note in the browser that says "this visitor is signed in".
 *
 * The session itself is a cookie the page cannot read, and the public pages
 * (pricing, guides, help, legal) do not ask the server who is signed in:
 * that would be one failed request per page for every anonymous visitor.
 * AuthGate, which does know, writes this note when a session starts and
 * removes it when one ends; the public top bar reads it to show "Open
 * Monitoring" instead of "Sign in". It is only a hint for what to show. If
 * it is stale, the link leads to the sign-in form, which then clears it.
 */
const KEY = "tma_signed_in";
const EVENT = "tma-session-hint";

export function writeSessionHint(signedIn: boolean): void {
  try {
    if (signedIn) {
      window.localStorage.setItem(KEY, "1");
    } else {
      window.localStorage.removeItem(KEY);
    }
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage can be blocked; the top bar then shows the signed-out links.
  }
}

function readSessionHint(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** False on the server and on first paint, then the stored value. */
export function useSessionHint(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const update = () => setSignedIn(readSessionHint());

    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return signedIn;
}
