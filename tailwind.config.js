/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Skilly inspirada en la identidad visual actual:
        // azul claro, amarillo cálido, lila, verde menta y carbón.
        primario: {
          50: '#F4F6FF',
          100: '#E9EDFF',
          200: '#D7DFFF',
          300: '#BDCAFF',
          400: '#9CB4FF',
          500: '#829CF0',
          600: '#6F86D6',
          700: '#5A6EB5',
          800: '#47598F',
          900: '#34436D',
        },
        crema: '#E9E9E9',
        superficie: '#FFFFFF',
        tinta: {
          DEFAULT: '#1A1A1A',
          suave: '#333333',
          tenue: '#666666',
        },
        gris: {
          100: '#F5F5F5',
          200: '#E9E9E9',
          300: '#D6D6D6',
          400: '#B8B8B8',
          500: '#8C8C8C',
          600: '#666666',
          700: '#4A4A4A',
          800: '#333333',
          900: '#1A1A1A',
        },
        borde: {
          DEFAULT: '#D6D6D6',
          fuerte: '#CC99FF',
        },
        lila: {
          50: '#F8F0FF',
          100: '#EEDFFF',
          300: '#CC99FF',
          500: '#B06FE8',
          600: '#9854CC',
          700: '#7E42AA',
        },
        naranja: {
          50: '#FFF1EC',
          100: '#FFE2D9',
          300: '#FE7254',
          500: '#E95B3E',
          600: '#D84E33',
          700: '#B63D27',
        },
        amarillo: {
          50: '#FFF9E5',
          100: '#FFF0B8',
          300: '#FFCC33',
          400: '#FFCC33',
          500: '#E6AE00',
          600: '#C99300',
          700: '#A97800',
        },
        menta: {
          50: '#EAFBF5',
          100: '#D0F5E9',
          300: '#33CC99',
          500: '#20B783',
          600: '#17966B',
          700: '#117653',
        },
        carbon: '#1A1A1A',
        exito: {
          50: '#EAFBF5',
          600: '#17966B',
          700: '#117653',
        },
        aviso: {
          50: '#FFF9E5',
          600: '#A97800',
          700: '#7A5900',
        },
        peligro: {
          50: '#FDF0EE',
          600: '#B93A2C',
          700: '#962E23',
        },
        info: {
          50: '#F0F5FF',
          600: '#5A6EB5',
        },
      },
      fontFamily: {
        sans: [
          'Space Mono',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        suave: '0 1px 2px rgba(26, 26, 26, 0.06), 0 1px 6px rgba(26, 26, 26, 0.04)',
      },
    },
  },
  plugins: [],
};
