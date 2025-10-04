// Simple test script to verify the HermesWhois API works
import fetch from "node-fetch";

const HERMESWHOIS_API = "https://hermeswhois.tr/whois.php";

async function testWhoisLookup(domain) {
  console.log(`\nTesting whois lookup for: ${domain}`);
  console.log("=".repeat(50));

  try {
    const response = await fetch(HERMESWHOIS_API, {
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

    if (data.result === "200") {
      console.log(`Domain: ${data.main.domain}`);
      if (data.main.CreationDate !== "404")
        console.log(`Created: ${data.main.CreationDate} (${data.main.CreationDateTimestamp})`);
      if (data.main.ExpiryDate !== "404")
        console.log(`Expires: ${data.main.ExpiryDate} (${data.main.ExpiryDateTimestamp})`);
      if (data.main.UpdatedDate !== "404")
        console.log(`Updated: ${data.main.UpdatedDate}`);
      if (data.main.DNSSEC !== "404")
        console.log(`DNSSEC: ${data.main.DNSSEC}`);
      console.log(`Cache: ${data.cache}`);

      // Show all fields for debugging
      console.log("\n📋 All fields:");
      Object.keys(data.main).forEach(key => {
        if (data.main[key] !== "404" && data.main[key] !== "") {
          console.log(`  ${key}: ${data.main[key]}`);
        }
      });

      console.log("\n✓ Test PASSED - API is working!");
    } else if (data.unregistered === "unregistered") {
      console.log("⚠ Domain is not registered");
    } else {
      console.log(`⚠ API returned: ${data.result}`);
    }
  } catch (error) {
    console.error("✗ Test FAILED:");
    console.error(error.message);
  }
}

// Test with different scenarios
async function runTests() {
  console.log("\n🧪 Running HermesWhois API Tests\n");

  // Test 1: Valid .tr domain
  await testWhoisLookup("google.tr");

  // Test 2: Valid .com domain with full data
  await testWhoisLookup("google.com");

  // Test 3: Unregistered .tr domain
  await testWhoisLookup("asdfghjklqwertyuiop12345.tr");

  // Test 4: Unregistered .com domain
  await testWhoisLookup("thisdoesnotexist123456789.com");
}

runTests();
