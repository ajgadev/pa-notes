// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321 },
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});