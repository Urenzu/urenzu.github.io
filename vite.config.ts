import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        writings: resolve(__dirname, 'writings.html'),
        resources: resolve(__dirname, 'resources.html'),
        'python-interpreter': resolve(__dirname, 'writings/python-interpreter.html'),
      },
    },
  },
});
