/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          destination: '/index.html',
        },
        {
          source: '/schoenen',
          destination: '/schoenen.html',
        },
        {
          source: '/motorkleding',
          destination: '/motorkleding.html',
        },
      ],
    };
  },
};

export default nextConfig;
