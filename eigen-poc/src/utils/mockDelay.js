export function mockDelay(ms = 1500) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
