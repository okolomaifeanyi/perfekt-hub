export async function resolveLinkPreviewRequest(requestUrl, fetchMetadata) {
  const url = new URL(requestUrl);
  const targetUrl = url.searchParams.get("url")?.trim() ?? "";

  if (!targetUrl) {
    return {
      status: 400,
      body: { error: "Missing url" },
    };
  }

  try {
    const metadata = await fetchMetadata(targetUrl);

    if (!metadata) {
      return {
        status: 404,
        body: { error: "Unable to generate preview" },
      };
    }

    return {
      status: 200,
      body: metadata,
    };
  } catch {
    return {
      status: 500,
      body: { error: "Unable to generate preview" },
    };
  }
}
