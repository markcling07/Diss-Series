import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server only trusts localhost by default and blocks cross-origin
  // requests to dev-only assets, which stops the client JS from running when
  // you open the app on a LAN address. Needed so phones on the same Wi-Fi can
  // reach a gallery's share link and QR code during development.
  // Listed per subnet rather than one broad pattern, because the machine's
  // address changes with the network it joins — add a line when it does.
  allowedDevOrigins: ['192.168.0.216', '192.168.0.*', '192.168.254.*'],

  // Nothing is gained by announcing the framework and version to scanners.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // The app never belongs in a frame. The only thing framing buys an
          // attacker is clickjacking the admin role controls.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Gallery codes travel in URLs and get pasted around. Keeping the
          // full path out of cross-origin referers is the difference between a
          // private link and a public one.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
