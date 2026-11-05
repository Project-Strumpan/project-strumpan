import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * React 19 / Next.js säker hook för att avgöra om komponenten är monterad i webbläsaren.
 * Förhindrar alla Hydration Mismatch-fel vid läsning av localStorage eller klientstate.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

