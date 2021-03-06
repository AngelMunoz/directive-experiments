// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    /* ... */
    public: { url: '/', static: true },
    src: { url: '/dist' },
  },
  plugins: [
    /* ... */
    '@snowpack/plugin-typescript'
  ],
  packageOptions: {
    /* ... */
    source: 'remote',
    types: true
  },
  devOptions: {
    /* ... */

  },
  buildOptions: {
    /* ... */
  },
};
