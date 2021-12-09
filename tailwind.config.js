const plugin = require('tailwindcss/plugin')

const checkedSiblingPlugin = plugin(function ({ addVariant, e }) {
  addVariant('checked-sibiling', ({ container }) => {
    container.walkRules((rule) => {
      rule.selector = `:checked ~ .checked-sibiling\\:${rule.selector.slice(1)}`
    })
  })
})
module.exports = {
  // mode: 'jit',
  purge: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js}'
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    colors: {
      primary: {
        DEFAULT: '#00b7fa',
        dark: '#094f68'
      },
      secondary: {
        DEFAULT: '#ae83e6',
        dark: '#173e4d'
      },
      success: {
        DEFAULT: '#81e686'
      },
      danger: {
        DEFAULT: '#ff443b'
      },
      warning: {
        DEFAULT: '#ffe600'
      },
      info: {
        DEFAULT: '#daf3fc'
      },
      dark: {
        DEFAULT: '#292d33'
      },
      light: {
        DEFAULT: '#bfc8d4'
      },
      white: {
        DEFAULT: '#e9edf3'
      },
      black: {
        DEFAULT: '#242525'
      }
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif']
    },
    extend: {}
  },
  variants: {
    extend: {
      display: ['group-hover'],
      opacity: ['disabled'],
      backgroundColor: ['checked', 'checked-sibiling'],
      borderColor: ['checked'],
      translate: ['active', 'checked-sibiling']
    }
  },
  plugins: [checkedSiblingPlugin]
}
