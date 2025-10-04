// Simple test script to verify the SSL API works
import fetch from "node-fetch";

const HERMESWHOIS_SSL_API = "https://hermeswhois.tr/ssl.php";

async function testSSLLookup(domain) {
  console.log(`\nTesting SSL lookup for: ${domain}`);
  console.log("=".repeat(50));

  try {
    const response = await fetch(HERMESWHOIS_SSL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `domain=${encodeURIComponent(domain)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("✓ API Response received");
    console.log(`Result: ${data.result}`);

    if (data.error) {
      console.log(`⚠ Error: ${data.error}`);
      return;
    }

    if (data.result === "200" && data.main) {
      console.log(`Domain: ${data.main.domain}`);
      console.log(`SSL Domain (CN): ${data.main.ssl_domain}`);
      console.log(`Issuer: ${data.main.issuer}`);
      console.log(`Issuer Org: ${data.main.issuer_organization}`);
      console.log(`Valid From: ${data.main.valid_from_date}`);
      console.log(`Valid To: ${data.main.valid_to_date}`);

      // Calculate days until expiry
      const expiryDate = new Date(data.main.valid_to_timestamp * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry > 0) {
        console.log(`Days Until Expiry: ${daysUntilExpiry} days`);
      } else {
        console.log(`⚠️  EXPIRED ${Math.abs(daysUntilExpiry)} days ago!`);
      }

      console.log(`Serial Number: ${data.main.serial_number}`);
      console.log(`Cache: ${data.cache}`);

      // Show alt names count
      if (data.main.alt_names) {
        const altNamesCount = data.main.alt_names.split(", ").length;
        console.log(`Alternative Names: ${altNamesCount} domains`);
      }

      console.log("\n✓ Test PASSED - SSL API is working!");
    } else {
      console.log(`⚠ Unexpected response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error("✗ Test FAILED:");
    console.error(error.message);
  }
}

// Test with different scenarios
async function runTests() {
  console.log("\n🧪 Running HermesWhois SSL API Tests\n");

  // Test 1: Valid SSL certificate
  await testSSLLookup("google.com");

  // Test 2: Another domain
  await testSSLLookup("github.com");

  // Test 3: Non-HTTPS domain (should fail)
  await testSSLLookup("example-no-ssl-123456.com");
}

runTests();
