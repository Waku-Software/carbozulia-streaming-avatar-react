import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return defineConfig({
    plugins: [react()],
    base: env.VITE_SERVER_BASE,
    server: {
      host: '0.0.0.0',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Monaco Editor - Large code editor library  
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
              return 'monaco-editor';
            }
            
            // Agora RTC SDK - Video/audio streaming library
            if (id.includes('agora-rtc-sdk-ng')) {
              return 'agora-rtc';
            }
            
            // Chart.js and related libraries
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'charts';
            }
            
            // React and React-DOM
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            if (id.includes('react') && !id.includes('react-dom')) {
              return 'react';
            }
            
            // Other node_modules - vendor chunk
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
      // Increase chunk size warning limit to account for Agora RTC SDK
      chunkSizeWarningLimit: 1300, // in kBs
      // Enable minification for better tree shaking
      minify: 'esbuild',
      target: 'es2020',
    },
    optimizeDeps: {
      // Include Agora SDK in optimization for faster dev builds
      include: ['agora-rtc-sdk-ng'],
    },
  });
});
