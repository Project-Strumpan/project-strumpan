import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

let startPromise: ReturnType<typeof worker.start> | undefined;

export function startInventoryMocking() {
  startPromise ??= worker.start({
    onUnhandledRequest: "bypass",
  });

  return startPromise;
}