import test from "node:test";
import assert from "node:assert/strict";
import {
  checkGoogleSafeBrowsing,
  checkVirusTotal,
  isLinkSafe,
} from "./link-safety.mjs";

function makeJsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  };
}

function recordingFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init, calls.length);
  };
  return { fetchImpl, calls };
}

test("checkGoogleSafeBrowsing returns safe:true when Google reports no matches", async () => {
  const { fetchImpl } = recordingFetch(() => makeJsonResponse(200, { matches: [] }));
  const result = await checkGoogleSafeBrowsing("https://example.com", "key", { fetchImpl });
  assert.deepEqual(result, { safe: true });
});

test("checkGoogleSafeBrowsing returns safe:false when Google reports a match", async () => {
  const { fetchImpl } = recordingFetch(() =>
    makeJsonResponse(200, { matches: [{ threatType: "MALWARE" }] })
  );
  const result = await checkGoogleSafeBrowsing("https://bad.example", "key", { fetchImpl });
  assert.equal(result.safe, false);
  assert.match(result.reason, /Google/);
});

test("checkGoogleSafeBrowsing returns null (not safe:true) on a non-2xx response, e.g. an invalid API key", async () => {
  // Regression test: the previous implementation read `data?.matches?.length > 0`
  // straight off the body without checking res.ok first. Google's error body for
  // an invalid key has no `matches` field, so that check silently evaluated to
  // false and every link was reported safe — VirusTotal never got a turn.
  const { fetchImpl } = recordingFetch(() =>
    makeJsonResponse(400, { error: { message: "API key not valid" } })
  );
  const result = await checkGoogleSafeBrowsing("https://example.com", "bad-key", { fetchImpl });
  assert.equal(result, null);
});

test("checkGoogleSafeBrowsing returns null and makes no request when no API key is configured", async () => {
  const { fetchImpl, calls } = recordingFetch(() => makeJsonResponse(200, { matches: [] }));
  const result = await checkGoogleSafeBrowsing("https://example.com", undefined, { fetchImpl });
  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test("checkGoogleSafeBrowsing returns null on a network error", async () => {
  const fetchImpl = async () => {
    throw new Error("network down");
  };
  const result = await checkGoogleSafeBrowsing("https://example.com", "key", { fetchImpl });
  assert.equal(result, null);
});

test("checkVirusTotal returns safe:false when the existing report has malicious detections", async () => {
  const { fetchImpl } = recordingFetch(() =>
    makeJsonResponse(200, { data: { attributes: { last_analysis_stats: { malicious: 3 } } } })
  );
  const result = await checkVirusTotal("https://bad.example", "key", { fetchImpl });
  assert.equal(result.safe, false);
  assert.match(result.reason, /VirusTotal/);
});

test("checkVirusTotal returns safe:true when the existing report has zero malicious detections", async () => {
  const { fetchImpl } = recordingFetch(() =>
    makeJsonResponse(200, { data: { attributes: { last_analysis_stats: { malicious: 0 } } } })
  );
  const result = await checkVirusTotal("https://example.com", "key", { fetchImpl });
  assert.deepEqual(result, { safe: true });
});

test("checkVirusTotal treats an unscanned URL (404) as inconclusive and queues it for a future scan", async () => {
  // Regression test: the previous implementation always POSTed a brand-new
  // scan and immediately re-read that scan's analysis, which is still
  // "queued" (malicious: 0) moments after submission — so an unscanned URL
  // always came back safe:true "for real", not "for now, check back later".
  const { fetchImpl, calls } = recordingFetch((url, init, callNumber) => {
    if (callNumber === 1) return makeJsonResponse(404, { error: { code: "NotFoundError" } });
    return makeJsonResponse(200, { data: { id: "queued-analysis-id" } });
  });

  const result = await checkVirusTotal("https://unseen.example", "key", { fetchImpl });
  assert.equal(result.safe, true);
  assert.match(result.reason, /queued/i);

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/api\/v3\/urls\//);
  assert.equal(calls[1].url, "https://www.virustotal.com/api/v3/urls");
  assert.equal(calls[1].init.method, "POST");
});

test("checkVirusTotal returns null on a non-2xx, non-404 response, e.g. an invalid API key", async () => {
  const { fetchImpl } = recordingFetch(() => makeJsonResponse(401, { error: { code: "WrongCredentialsError" } }));
  const result = await checkVirusTotal("https://example.com", "bad-key", { fetchImpl });
  assert.equal(result, null);
});

test("checkVirusTotal returns null and makes no request when no API key is configured", async () => {
  const { fetchImpl, calls } = recordingFetch(() => makeJsonResponse(200, {}));
  const result = await checkVirusTotal("https://example.com", undefined, { fetchImpl });
  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test("isLinkSafe returns Google's unsafe verdict without ever calling VirusTotal", async () => {
  const { fetchImpl, calls } = recordingFetch(() =>
    makeJsonResponse(200, { matches: [{ threatType: "SOCIAL_ENGINEERING" }] })
  );
  const result = await isLinkSafe("https://bad.example", {
    googleApiKey: "g-key",
    virusTotalApiKey: "vt-key",
    fetchImpl,
  });
  assert.equal(result.safe, false);
  assert.equal(result.source, "google");
  assert.equal(calls.length, 1);
});

test("isLinkSafe falls through to VirusTotal when Google's response can't be trusted", async () => {
  const { fetchImpl, calls } = recordingFetch((url, init, callNumber) => {
    if (callNumber === 1) return makeJsonResponse(400, { error: "bad google key" });
    return makeJsonResponse(200, { data: { attributes: { last_analysis_stats: { malicious: 0 } } } });
  });

  const result = await isLinkSafe("https://example.com", {
    googleApiKey: "bad-key",
    virusTotalApiKey: "vt-key",
    fetchImpl,
  });
  assert.deepEqual(result, { safe: true, source: "virustotal" });
  assert.equal(calls.length, 2);
});

test("isLinkSafe fails open with source:unknown when neither provider is configured", async () => {
  const { fetchImpl, calls } = recordingFetch(() => makeJsonResponse(200, {}));
  const result = await isLinkSafe("https://example.com", { fetchImpl });
  assert.equal(result.safe, true);
  assert.equal(result.source, "unknown");
  assert.equal(calls.length, 0);
});
