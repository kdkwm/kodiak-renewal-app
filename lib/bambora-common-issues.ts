// Common Bambora "Authorization Failed" causes and solutions

export const bamboraIssues = {
  authorizationFailed: {
    // Most common causes (in order of likelihood)
    causes: [
      {
        issue: "Wrong API Key",
        description: "Using wrong API key for the merchant account",
        solution: "Double-check API key in Bambora dashboard",
        likelihood: "Very High",
      },
      {
        issue: "Account Not Activated",
        description: "Sandbox account created but not fully activated",
        solution: "Contact Bambora to activate account for API transactions",
        likelihood: "High",
      },
      {
        issue: "Missing API Permissions",
        description: "Account doesn't have permission for API transactions",
        solution: "Enable API access in account settings",
        likelihood: "High",
      },
      {
        issue: "Wrong Merchant ID",
        description: "Typo in merchant ID",
        solution: "Verify merchant ID matches dashboard exactly",
        likelihood: "Medium",
      },
      {
        issue: "Account Suspended",
        description: "Account temporarily suspended",
        solution: "Contact Bambora support",
        likelihood: "Low",
      },
      {
        issue: "IP Restrictions",
        description: "API calls blocked from your server IP",
        solution: "Check IP whitelist settings",
        likelihood: "Low",
      },
    ],

    // What Bambora WON'T tell you
    hiddenReasons: [
      "Account setup incomplete (missing business verification)",
      "API feature not enabled on account plan",
      "Recurring billing not activated (for installment payments)",
      "Account in 'test mode' but using production endpoint",
      "Rate limiting (too many failed attempts)",
    ],

    // Debugging steps
    debugSteps: [
      "1. Test with minimal transaction (no tokens, basic card data)",
      "2. Try production credentials if available",
      "3. Test without recurring billing flags",
      "4. Check if account works with Bambora's test tools",
      "5. Contact support with specific merchant ID",
    ],
  },
}

// Helper function to generate support email
export function generateSupportEmail(merchantId: string) {
  return `
Subject: API Authorization Failed - Merchant ID ${merchantId}

Hello Bambora Support,

I'm experiencing "Authorization Failed" errors when attempting API transactions with:
- Merchant ID: ${merchantId}
- Error: Authorization Failed (no additional details provided)
- Endpoint: https://api.na.bambora.com/scripts/process_transaction.asp

Could you please verify:
1. Is this account properly activated for API transactions?
2. Are there any missing permissions or configuration issues?
3. Is recurring billing enabled (needed for installment payments)?

The same integration works with production credentials, suggesting the code is correct.

Thank you for your assistance.
`
}
