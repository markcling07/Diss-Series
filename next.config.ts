import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server only trusts localhost by default and blocks cross-origin
  // requests to dev-only assets, which stops the client JS from running when
  // you open the app on a LAN address. Needed so phones on the same Wi-Fi can
  // reach a gallery's share link and QR code during development.
  allowedDevOrigins: ['192.168.0.216', '192.168.0.*'],
};

export default nextConfig;
