"use client";

import { useTopUp } from "./top-up-provider";

/**
 * Every reload entry point opens the dice challenge instead of crediting the
 * wallet directly. Keeping the same `mutate` / `isPending` shape means the
 * existing buttons across the floor did not need to change.
 */
export function useFaucetClaim() {
  const { openTopUp, isPending } = useTopUp();
  return { mutate: openTopUp, open: openTopUp, isPending };
}
