// Triggers a browser download from an axios response fetched with
// `responseType: 'blob'`.
//
// Guards against a real vueportal quirk: some blob-download endpoints
// (confirmed in EmployeeMasterDataController@template_download) wrap their
// failure path in `response()->json([...], 200)` — a successful HTTP
// status carrying a JSON error body instead of the expected binary file.
// Axios has no way to route that into a `catch` block (200 is success),
// so without this check the browser would silently save a corrupted
// "file" that's actually JSON text with a spreadsheet extension. Detected
// via the response's actual Content-Type header rather than trying to
// sniff the blob's bytes.
export default async function downloadBlobResponse(response, filename, messageApi) {
  const contentType = response.headers?.['content-type'] || '';

  if (contentType.includes('json')) {
    const text = await response.data.text();
    let message = 'The server did not return a downloadable file.';
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || parsed.message || message;
    } catch {
      // body wasn't valid JSON either — keep the generic message
    }
    messageApi.error(message);
    return false;
  }

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
}
