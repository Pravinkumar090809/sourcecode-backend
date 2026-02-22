const cashfreeConfig = {
  appId: process.env.CASHFREE_APP_ID,
  secretKey: process.env.CASHFREE_SECRET_KEY,
  apiUrl:
    process.env.NODE_ENV === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg",
  environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
};

export default cashfreeConfig;