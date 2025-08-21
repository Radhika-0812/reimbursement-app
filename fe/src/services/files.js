// Presigned S3 upload helpers

import { API_BASE, authHeader } from "./http";

// Ask backend for a presigned PUT URL + object key for S3
export async function getPresignedUrl(filename, contentType) {
  const res = await fetch(`${API_BASE}/api/files/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ filename, contentType }),
  });
  if (!res.ok) throw new Error(await res.text());
  // Expected: { url, key }
  return res.json();
}

// Upload the file directly to S3 with the presigned URL
export async function uploadToS3(presignedUrl, file) {
  const res = await fetch(presignedUrl, { method: "PUT", body: file });
  if (!res.ok) throw new Error("S3 upload failed");
}
