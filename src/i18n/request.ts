import { getRequestConfig } from "next-intl/server";

// The MVP is Spanish-only, so there is no locale routing. Adding a language
// later means a second catalog in messages/ and choosing the locale here.
export default getRequestConfig(async () => {
  const locale = "es";
  return {
    locale,
    // Honduras has no daylight saving time. A fixed zone keeps dates the same
    // on the server and in the browser.
    timeZone: "America/Tegucigalpa",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
