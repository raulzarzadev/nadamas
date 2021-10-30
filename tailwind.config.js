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
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {}
  },
  variants: {
    extend: {
      display: ['group-hover', ],
      opacity: ['disabled'],
      backgroundColor: ['checked', 'checked-sibiling'],
      borderColor: ['checked'],
      translate: ['active', 'checked-sibiling']
    }
  },
  plugins: [checkedSiblingPlugin]
}
