import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server only trusts localhost by default and blocks cross-origin
  // requests to dev-only assets, which stops the client JS from running when
  // you open the app on a LAN address. Needed so phones on the same Wi-Fi can
  // reach a gallery's share link and QR code during development.
  // Listed per subnet rather than one broad pattern, because the machine's
  // address changes with the network it joins — add a line when it does.
  allowedDevOrigins: ['192.168.0.216', '192.168.0.*', '192.168.254.*'],
};

export default nextConfig;
