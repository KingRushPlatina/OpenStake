"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 1000);
  return () => window.clearInterval(timer);
}

function getSnapshot() {
  return Math.floor(Date.now() / 1000) * 1000;
}

function getServerSnapshot() {
  return 0;
}

export function useClock() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
