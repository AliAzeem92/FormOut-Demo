import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  if (process.env.POSTEX_API_TOKEN) return;
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}

loadEnvLocal();

const token = process.env.POSTEX_API_TOKEN ? process.env.POSTEX_API_TOKEN.trim() : "";

if (!token) {
  console.error("Error: POSTEX_API_TOKEN is not set or empty in .env.local");
  process.exit(1);
}

const BASE_URL = "https://api.postex.pk/services/integration/api/order";

async function checkPostEx() {
  try {
    // 1. Get operational delivery cities
    // Note: PostEx API v4.1.9 guide specifies operationalCityType=Delivery, but PostEx's Spring Boot
    // backend defines the enum in lowercase (delivery). We try documented "Delivery" and fallback to "delivery".
    let cityRes = await fetch(`${BASE_URL}/v2/get-operational-city?operationalCityType=Delivery`, {
      method: "GET",
      headers: {
        token: token,
      },
    });

    if (cityRes.status === 400) {
      const fallbackRes = await fetch(`${BASE_URL}/v2/get-operational-city?operationalCityType=delivery`, {
        method: "GET",
        headers: {
          token: token,
        },
      });
      if (fallbackRes.ok) {
        cityRes = fallbackRes;
      }
    }

    const cityData = await cityRes.json().catch(() => null);

    console.log("--- Operational Cities ---");
    console.log(`HTTP status: ${cityRes.status}`);
    console.log(`statusCode: ${cityData?.statusCode ?? "N/A"}`);
    console.log(`statusMessage: ${cityData?.statusMessage ?? "N/A"}`);

    if (cityData?.dist && Array.isArray(cityData.dist)) {
      const deliveryCities = cityData.dist.filter(
        (c) => c.isDeliveryCity === true || c.isDeliveryCity === "true"
      );
      console.log(`Number of delivery cities: ${deliveryCities.length}`);
    } else {
      console.log("Number of delivery cities: 0");
    }

    // 2. Get merchant pickup addresses
    const addressRes = await fetch(`${BASE_URL}/v1/get-merchant-address`, {
      method: "GET",
      headers: {
        token: token,
      },
    });

    const addressData = await addressRes.json().catch(() => null);

    console.log("\n--- Pickup Addresses ---");
    console.log(`HTTP status: ${addressRes.status}`);
    console.log(`statusCode: ${addressData?.statusCode ?? "N/A"}`);
    console.log(`statusMessage: ${addressData?.statusMessage ?? "N/A"}`);

    if (addressData?.dist && Array.isArray(addressData.dist)) {
      console.log(`Found ${addressData.dist.length} pickup address(es):`);
      for (const addr of addressData.dist) {
        // ONLY print cityName, address, addressCode - NO phone numbers
        console.log(`- City: ${addr.cityName}, Address: ${addr.address}, Code: ${addr.addressCode}`);
      }
    } else {
      console.log("No pickup addresses found.");
    }
  } catch (error) {
    console.error("Network or execution error while checking PostEx API:", error.message);
    process.exit(1);
  }
}

checkPostEx();
