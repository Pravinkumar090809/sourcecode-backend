import supabase from "../config/supabase.js";

/**
 * Generate a signed download URL for a ZIP file
 * @param {string} zipPath - path inside the storage bucket
 * @param {number} expiresIn - seconds until URL expires (default 1 hour)
 * @returns {Promise<string>} signed URL
 */
export const generateDownloadUrl = async (zipPath, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from("source-codes")
    .createSignedUrl(zipPath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }

  return data.signedUrl;
};

export default generateDownloadUrl;
