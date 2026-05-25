interface GeoData {
  country: string;
  city: string;
  isp: string;
}

export async function getGeoData(ip: string): Promise<GeoData> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip === "::ffff:127.0.0.1") {
    return { country: "Local", city: "Local", isp: "Local" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,isp`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return { country: "", city: "", isp: "" };
    const data = await res.json();
    return {
      country: data.country || "",
      city: data.city || "",
      isp: data.isp || "",
    };
  } catch {
    return { country: "", city: "", isp: "" };
  }
}
