/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare module "*?raw" {
  const content: string;
  export default content;
}

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
