import { getRequestConfig } from "next-intl/server";

// The MVP is Spanish-only, so there is no locale routing. Adding a language
// later means a second catalog in messages/ and choosing the locale here.
export default getRequestConfig(async () => {
  const locale = "es";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
