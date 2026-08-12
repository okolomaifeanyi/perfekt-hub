import assert from "node:assert/strict";
import test from "node:test";
import { createLazyProxy } from "./lazy.mjs";

test("createLazyProxy defers factory execution until first access", () => {
  let calls = 0;

  const proxy = createLazyProxy(() => {
    calls += 1;

    return {
      value: 1,
      get doubled() {
        return this.value * 2;
      },
      readValue() {
        return this.value;
      },
    };
  });

  assert.equal(calls, 0);

  assert.equal(proxy.value, 1);
  assert.equal(calls, 1);

  assert.equal(proxy.doubled, 2);
  assert.equal(calls, 1);

  assert.equal(proxy.readValue(), 1);
  assert.equal(calls, 1);

  proxy.value = 5;
  assert.equal(proxy.readValue(), 5);
  assert.equal(calls, 1);
});
