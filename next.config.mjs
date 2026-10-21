/** @type {import('next').NextConfig} */
const nextConfig = {
  // Oude adressen met .html sturen we blijvend door naar het nette adres,
  // zodat Google elke pagina maar onder één adres kent.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/:pagina(wassalon|zakelijk|contact).html', destination: '/:pagina', permanent: true },
      // Schoenen en motorkleding staan niet meer in het aanbod: oude links gaan naar de startpagina.
      { source: '/:pagina(schoenen|motorkleding){.html}?', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          destination: '/index.html',
        },
        {
          source: '/wassalon',
          destination: '/wassalon.html',
        },
        {
          // Schermt de oude React-pagina op src/app/zakelijk af, net als bij /contact.
          source: '/zakelijk',
          destination: '/zakelijk.html',
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
