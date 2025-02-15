import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: './dist', // Output directory (outside of src/)
  },
  server: {
    open: '/index.html', // Vite will open this in the browser
    proxy: {
        '/socket.io': {
          target: 'http://127.0.0.1:3000',
          ws: true, // enable websockets proxying
        }
      }  
  }
});
