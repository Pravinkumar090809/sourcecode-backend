import supabase from "../config/supabase.js";

const BUCKET_NAME = "source-codes";

/**
 * Upload a ZIP file to Supabase Storage
 * @param {Buffer} fileBuffer - file data
 * @param {string} fileName - original file name
 * @returns {Promise<{path: string}>}
 */
export const uploadZipFile = async (fileBuffer, fileName) => {
  // Sanitize filename
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `zips/${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: "application/zip",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return { path: data.path };
};

/**
 * Generate a signed URL for downloading
 * @param {string} zipPath - path inside bucket
 * @param {number} expiresIn - seconds (default 1 hour)
 * @returns {Promise<string>}
 */
export const getSignedDownloadUrl = async (zipPath, expiresIn = 600) => {
  // default to 10 minutes (600s) to satisfy security requirement
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(zipPath, expiresIn);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);

  return data.signedUrl;
};

/**
 * Delete a file from storage
 * @param {string} zipPath - path inside bucket
 */
export const deleteFile = async (zipPath) => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([zipPath]);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  return { deleted: true };
};

/**
 * List all files in the zips folder
 */
export const listFiles = async () => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list("zips", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error) throw new Error(`List failed: ${error.message}`);

  return data;
};
