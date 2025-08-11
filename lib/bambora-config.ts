// Bambora Configuration - Updated for proper API usage
export const bamboraConfig = {
  // Production credentials
  production: {
    merchantId: "245162388",
    apiKey: "B4372eC6f40B4E05bd90Ece2E3Be734b", // Regular API passcode for authentication
    recurringApiKey: "B4372eC6f40B4E05bd90Ece2E3Be734b", // Recurring API passcode for recurring transactions
    endpoint: "https://api.na.bambora.com/v1/payments", // Modern REST API
    legacyEndpoint: "https://api.na.bambora.com/scripts/process_transaction.asp", // Legacy endpoint (deprecated)
  },

  // Sandbox credentials
  sandbox: {
    merchantId: "383613253",
    apiKey: "0c3a403f7C0547008423f18063C00275", // Regular API passcode for authentication
    recurringApiKey: "858966679b9942F3Ba0B0462255dA9AE", // Recurring API passcode for recurring transactions
    endpoint: "https://api.na.bambora.com/v1/payments", // Modern REST API
    legacyEndpoint: "https://api.na.bambora.com/scripts/process_transaction.asp", // Legacy endpoint (deprecated)
  },

  // Test card numbers for sandbox testing
  testCards: {
    visa: {
      number: "4030000010001234",
      cvv: "123",
      expiry: "12/25",
      description: "Approved Visa",
    },
    mastercard: {
      number: "5100000010001004",
      cvv: "123",
      expiry: "12/25",
      description: "Approved Mastercard",
    },
    amex: {
      number: "371100001000131",
      cvv: "1234",
      expiry: "12/25",
      description: "Approved Amex",
    },
    declined: {
      number: "4003050500040005",
      cvv: "123",
      expiry: "12/25",
      description: "Always Declined",
    },
    cvvFail: {
      number: "4030000010001234",
      cvv: "999", // Wrong CVV to test CVV validation
      expiry: "12/25",
      description: "CVV Validation Fail",
    },
  },
}

// Helper to get current environment config
export const getCurrentBamboraConfig = () => {
  const isProduction = process.env.NODE_ENV === "production" && process.env.USE_PRODUCTION_BAMBORA === "true"
  return isProduction ? bamboraConfig.production : bamboraConfig.sandbox
}

// API Usage Notes:
// 1. Regular API Key (apiKey): Used for Authorization header authentication
// 2. Recurring API Key (recurringApiKey): Used as passcode for recurring transactions
// 3. Modern REST API: Better error handling, JSON responses, more features
// 4. Legacy API: URL-encoded responses, limited features, being phased out
