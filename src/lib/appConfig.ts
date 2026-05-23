export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Spin the Wheel",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    "Pick a random name from a Google Sheet and reveal a YouTube video or message.",
  siteLabel: process.env.NEXT_PUBLIC_SITE_LABEL || "",
  credit: process.env.NEXT_PUBLIC_APP_CREDIT || "",
  logoSrc: process.env.NEXT_PUBLIC_LOGO_SRC || "/logo.png",
};
