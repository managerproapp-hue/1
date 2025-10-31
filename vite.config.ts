import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Esto hace que la variable de entorno esté disponible en el código del lado del cliente.
    // Vercel inyectará el valor de la variable de entorno API_KEY en el momento de la compilación.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  }
});
