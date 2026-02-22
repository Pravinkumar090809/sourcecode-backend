// Cashfree configuration
const cashfreeConfig = {
  appId: process.env.CASHFREE_APP_ID,
  secretKey: process.env.CASHFREE_SECRET_KEY,
  apiUrl: process.env.CASHFREE_API_URL || "https://sandbox.cashfree.com/pg",
};

if (!cashfreeConfig.appId || !cashfreeConfig.secretKey) {
  console.warn("⚠️  Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY in .env — payment features disabled");
}

export default cashfreeConfig;
