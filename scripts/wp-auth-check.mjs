/**
 * Node script to run the WP auth-check via fetch.
 * v0 can execute scripts in the /scripts folder.
 * Usage in v0: Run this script to see the JSON response in the console.
 */

const SECRET = "uzZ8!nJ1t!F0K^pX"
const URL = "https://kodiaksnowremoval.ca/wp-json/kodiak/v1/auth-check"

async function main() {
  try {
    const res = await fetch(URL, {
      headers: { "x-kodiak-secret": SECRET, Accept: "application/json" },
    })
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = { _raw: text }
    }
    console.log("HTTP", res.status)
    console.log(JSON.stringify(json, null, 2))
  } catch (err) {
    console.error("Auth-check failed:", err)
    process.exit(1)
  }
}

main()
