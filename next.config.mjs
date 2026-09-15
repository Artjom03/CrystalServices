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
        {
          // Schermt de oude React-pagina op src/app/contact af: /contact toont
          // voortaan de statische pagina in de huisstijl van de rest van de site.
          source: '/contact',
          destination: '/contact.html',
        },
      ],
    };
  },
};

export default nextConfig;
