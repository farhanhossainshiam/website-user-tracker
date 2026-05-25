import { UAParser } from "ua-parser-js";

export function parseUserAgent(ua: string) {
  const parser = new UAParser(ua);
  const result = parser.getResult();

  return {
    browser: result.browser.name || "",
    browserVersion: result.browser.version || "",
    os: result.os.name || "",
    osVersion: result.os.version || "",
    deviceType: result.device.type || "desktop",
  };
}
