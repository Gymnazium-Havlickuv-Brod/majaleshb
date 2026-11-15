// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://majaleshb.cz',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  image: {
    // fotky se zpracují při buildu (sharp) do AVIF/WebP v několika šířkách
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
