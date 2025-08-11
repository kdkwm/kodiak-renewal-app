// Bambora Account Troubleshooting Guide

export const bamboraTroubleshooting = {
  authorizationFailed: {
    possibleCauses: [
      "Invalid Merchant ID or API Key",
      "Account not activated or suspended",
      "Insufficient account permissions",
      "Wrong environment (sandbox vs production)",
      "Account configuration incomplete",
      "API key expired or revoked",
    ],

    solutions: [
      "Verify merchant ID and API keys in Bambora dashboard",
      "Check account status and activation",
      "Ensure recurring billing is enabled if using installments",
      "Contact Bambora support to verify account configuration",
      "Test with production credentials if sandbox fails",
    ],

    nextSteps: [
      "Try production credentials (set USE_PRODUCTION = true)",
      "Test with a simple one-time payment first",
      "Contact Bambora support with merchant ID: 383613253",
      "Verify account has proper permissions for API transactions",
    ],
  },

  // Your account details for reference
  accounts: {
    production: {
      merchantId: "245162388",
      status: "Working in your PHP code",
      note: "These credentials work in your existing system",
    },
    sandbox: {
      merchantId: "383613253",
      status: "Getting Authorization Failed",
      note: "New developer account - may need activation",
    },
  },
}
