import { describe, expect, it } from "vitest";
import swSource from "../public/sw.js?raw";

type Listener = (event: unknown) => void;

type FakeResponse = {
  ok: boolean;
  type: string;
  clone: () => FakeResponse;
};

function makeResponse(ok: boolean, type: string): FakeResponse {
  const res: FakeResponse = { ok, type, clone: () => res };
  return res;
}

/**
 * sw.jsをスタブしたグローバル(self / caches / fetch)の下で実行し、
 * 登録されたイベントリスナーとcache.put呼び出しの記録を返す。
 */
function loadServiceWorker(fetchResult: FakeResponse) {
  const listeners = new Map<string, Listener>();
  const puts: Array<{ request: unknown; response: FakeResponse }> = [];

  const fakeCache = {
    addAll: () => Promise.resolve(),
    put: (request: unknown, response: FakeResponse) => {
      puts.push({ request, response });
      return Promise.resolve();
    },
  };
  const fakeCaches = {
    open: () => Promise.resolve(fakeCache),
    match: () => Promise.resolve(undefined),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
  };
  const fakeSelf = {
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, listener);
    },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const fakeFetch = () => Promise.resolve(fetchResult);

  new Function("self", "caches", "fetch", swSource)(
    fakeSelf,
    fakeCaches,
    fakeFetch,
  );
  return { listeners, puts };
}

async function dispatchFetch(
  listeners: Map<string, Listener>,
  request: { method: string; mode: string },
): Promise<unknown> {
  const handler = listeners.get("fetch");
  if (!handler) throw new Error("fetchリスナーが登録されていない");
  let responded: Promise<unknown> | undefined;
  handler({
    request,
    respondWith: (promise: Promise<unknown>) => {
      responded = promise;
    },
  });
  const response = await responded;
  // cache.putは待たれない副作用(caches.open().then(...))なので、
  // マイクロタスクを数回流して完了させてから検証する
  for (let i = 0; i < 5; i++) await Promise.resolve();
  return response;
}

describe("Service Workerのランタイムキャッシュ", () => {
  const getRequest = { method: "GET", mode: "no-cors" };

  it("同一オリジンの正常応答(ok + basic)はキャッシュに保存する", async () => {
    const response = makeResponse(true, "basic");
    const { listeners, puts } = loadServiceWorker(response);
    const result = await dispatchFetch(listeners, getRequest);
    expect(result).toBe(response);
    expect(puts).toHaveLength(1);
    expect(puts[0].request).toBe(getRequest);
  });

  it("エラーレスポンス(404等)はキャッシュしない", async () => {
    const response = makeResponse(false, "basic");
    const { listeners, puts } = loadServiceWorker(response);
    const result = await dispatchFetch(listeners, getRequest);
    expect(result).toBe(response);
    expect(puts).toHaveLength(0);
  });

  it("リダイレクト由来のopaqueレスポンスはキャッシュしない", async () => {
    const response = makeResponse(false, "opaque");
    const { listeners, puts } = loadServiceWorker(response);
    const result = await dispatchFetch(listeners, getRequest);
    expect(result).toBe(response);
    expect(puts).toHaveLength(0);
  });

  it("クロスオリジン(basic以外)のレスポンスはキャッシュしない", async () => {
    const response = makeResponse(true, "cors");
    const { listeners, puts } = loadServiceWorker(response);
    const result = await dispatchFetch(listeners, getRequest);
    expect(result).toBe(response);
    expect(puts).toHaveLength(0);
  });

  it("GET以外のリクエストには関与しない", async () => {
    const { listeners, puts } = loadServiceWorker(makeResponse(true, "basic"));
    const handler = listeners.get("fetch");
    if (!handler) throw new Error("fetchリスナーが登録されていない");
    let respondWithCalled = false;
    handler({
      request: { method: "POST", mode: "no-cors" },
      respondWith: () => {
        respondWithCalled = true;
      },
    });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(respondWithCalled).toBe(false);
    expect(puts).toHaveLength(0);
  });
});
