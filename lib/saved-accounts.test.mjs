import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SAVED_ACCOUNTS,
  readSavedAccounts,
  rememberSavedAccount,
  removeSavedAccount,
} from "./saved-accounts.mjs";

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test("rememberSavedAccount upserts and keeps newest first", () => {
  const storage = createMemoryStorage();

  rememberSavedAccount(storage, {
    uid: "one",
    username: "one",
    accessToken: "a",
    refreshToken: "r",
    lastUsedAt: "2024-01-01T00:00:00.000Z",
  });

  rememberSavedAccount(storage, {
    uid: "two",
    username: "two",
    accessToken: "b",
    refreshToken: "s",
    lastUsedAt: "2024-01-02T00:00:00.000Z",
  });

  const accounts = readSavedAccounts(storage);
  assert.deepEqual(accounts.map(account => account.uid), ["two", "one"]);
});

test("rememberSavedAccount trims the saved account list", () => {
  const storage = createMemoryStorage();

  for (let index = 0; index < MAX_SAVED_ACCOUNTS + 1; index += 1) {
    rememberSavedAccount(storage, {
      uid: `user-${index}`,
      username: `user-${index}`,
      accessToken: String(index),
      refreshToken: `refresh-${index}`,
      lastUsedAt: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    });
  }

  const accounts = readSavedAccounts(storage);
  assert.equal(accounts.length, MAX_SAVED_ACCOUNTS);
  assert.equal(accounts[0].uid, `user-${MAX_SAVED_ACCOUNTS}`);
});

test("removeSavedAccount deletes a saved account", () => {
  const storage = createMemoryStorage();

  rememberSavedAccount(storage, {
    uid: "one",
    username: "one",
    accessToken: "a",
    refreshToken: "r",
    lastUsedAt: "2024-01-01T00:00:00.000Z",
  });

  removeSavedAccount(storage, "one");

  assert.deepEqual(readSavedAccounts(storage), []);
});
