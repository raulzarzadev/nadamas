const plugin = require('tailwindcss/plugin')

// Let's create a plugin that adds utilities!
const capitalizeFirst = plugin(function ({ addUtilities }) {
  const newUtilities = {
    '.capitalize-first:first-letter': {
      textTransform: 'uppercase'
    }
  }
  addUtilities(newUtilities, ['responsive', 'hover'])
})
const checkedSiblingPlugin = plugin(function ({ addVariant, e }) {
  addVariant('checked-sibiling', ({ container }) => {
    container.walkRules((rule) => {
      rule.selector = `:checked ~ .checked-sibiling\\:${rule.selector.slice(1)}`
    })
  })
})
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    // './src/components/**/*.{js}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkTheme: 'dark',
  daisyui: {
    themes: ['dark', 'light', 'cupcake']
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
  plugins: [checkedSiblingPlugin, require('daisyui'), capitalizeFirst]
}

const theme = {
  colors: {
    primary: {
      DEFAULT: '#00b7fa',
      dark: '#094f68',
      light: '#22c4ff'
    },
    secondary: {
      light: '#3093e4',
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
    },
    transparent: 'rgb(0,0,0,0)'
  },
  fontFamily: {
    sans: ['Graphik', 'sans-serif'],
    serif: ['Merriweather', 'serif']
  }
}
