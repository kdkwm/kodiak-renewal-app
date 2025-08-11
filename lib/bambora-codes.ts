// Lightweight reference helpers for Bambora responses

export type BankCodeInfo = {
  code: string
  meaning: string
  cardholderMessage: string
  merchantAction: string
}

export const bankCodeMap: Record<string, BankCodeInfo> = {
  "00": {
    code: "00",
    meaning: "Approved",
    cardholderMessage: "The bank approved the transaction.",
    merchantAction: "No action required.",
  },
  "05": {
    code: "05",
    meaning: "Do not honor",
    cardholderMessage: "The bank declined the transaction.",
    merchantAction:
      "Ask the customer to call their bank or use a different card. Try again later; do not retry rapidly.",
  },
  "12": {
    code: "12",
    meaning: "Invalid transaction",
    cardholderMessage: "The bank rejected the transaction type.",
    merchantAction: "Verify request fields and card usage type with the acquirer.",
  },
  "13": {
    code: "13",
    meaning: "Invalid amount",
    cardholderMessage: "The transaction amount is invalid.",
    merchantAction: "Send a positive amount with max 2 decimals; verify currency.",
  },
  "14": {
    code: "14",
    meaning: "Invalid card number",
    cardholderMessage: "The card number is invalid.",
    merchantAction: "Re-enter card number or use a different card.",
  },
  "41": {
    code: "41",
    meaning: "Lost card",
    cardholderMessage: "The card was reported lost.",
    merchantAction: "Do not retry. Ask for a different card.",
  },
  "43": {
    code: "43",
    meaning: "Stolen card",
    cardholderMessage: "The card was reported stolen.",
    merchantAction: "Do not retry. Ask for a different card.",
  },
  "51": {
    code: "51",
    meaning: "Insufficient funds",
    cardholderMessage: "There are insufficient funds.",
    merchantAction: "Ask the customer to use another card or add funds and retry later.",
  },
  "54": {
    code: "54",
    meaning: "Expired card",
    cardholderMessage: "The card has expired.",
    merchantAction: "Update the expiry date or use a different card.",
  },
  "57": {
    code: "57",
    meaning: "Transaction not permitted to cardholder",
    cardholderMessage: "This type of purchase is not permitted.",
    merchantAction: "Ask the customer to call their bank or try a different card.",
  },
  "62": {
    code: "62",
    meaning: "Restricted card",
    cardholderMessage: "The card is restricted for this usage.",
    merchantAction: "Ask the customer to contact their bank or use a different card.",
  },
  "63": {
    code: "63",
    meaning: "Security violation",
    cardholderMessage: "Security checks failed.",
    merchantAction: "Ensure CVD/AVS are provided and correct; retry once.",
  },
  "68": {
    code: "68",
    meaning: "Response received too late",
    cardholderMessage: "The bank took too long to respond.",
    merchantAction: "Retry later. Check network and acquirer status.",
  },
  "75": {
    code: "75",
    meaning: "PIN tries exceeded",
    cardholderMessage: "Too many authentication attempts.",
    merchantAction: "Ask customer to try later or use another card.",
  },
  "91": {
    code: "91",
    meaning: "Issuer or switch inoperative",
    cardholderMessage: "Temporary bank issue.",
    merchantAction: "Retry later. If persistent, contact acquirer.",
  },
  "96": {
    code: "96",
    meaning: "System malfunction",
    cardholderMessage: "Temporary processing issue.",
    merchantAction: "Retry later; check gateway/acquirer status.",
  },
}

export function explainBankCode(code?: string): BankCodeInfo {
  const c = String(code || "").replace(/\s+/g, "")
  if (bankCodeMap[c]) return bankCodeMap[c]
  return {
    code: c || "(none)",
    meaning: "Unknown/Unmapped code",
    cardholderMessage: c ? "Your bank declined the transaction." : "No bank response code was provided.",
    merchantAction: c
      ? "Check full gateway response for details. If this repeats, contact your acquirer with the code."
      : "Verify the gateway request reached the acquirer. Check gateway logs and credentials.",
  }
}

// AVS mapping (typical values; may vary by region)
export const avsMap: Record<string, { meaning: string; action: string }> = {
  Y: { meaning: "Address and postal code match", action: "Proceed" },
  A: { meaning: "Address matches; postal code does not", action: "Review; consider contacting customer" },
  Z: { meaning: "Postal code matches; address does not", action: "Review; consider contacting customer" },
  N: { meaning: "No match", action: "High risk: verify billing address or request another card" },
  U: { meaning: "Unavailable", action: "Retry or proceed with caution" },
  R: { meaning: "System unavailable; retry", action: "Retry later" },
}

// CVD/CVV mapping
export const cvdMap: Record<string, { meaning: string; action: string }> = {
  M: { meaning: "Match", action: "Proceed" },
  N: { meaning: "No match", action: "High risk: verify cvv or try another card" },
  P: { meaning: "Not processed", action: "Retry with CVV" },
  S: { meaning: "Should have been present", action: "Collect CVV and retry" },
  U: { meaning: "Issuer unable to process", action: "Retry later or proceed with caution" },
}

export function explainAvs(code?: string) {
  const k = String(code || "").toUpperCase()
  return avsMap[k] || { meaning: "Unknown AVS result", action: "Verify billing address and postal code" }
}
export function explainCvd(code?: string) {
  const k = String(code || "").toUpperCase()
  return cvdMap[k] || { meaning: "Unknown CVD/CVV result", action: "Collect CVV and retry" }
}
