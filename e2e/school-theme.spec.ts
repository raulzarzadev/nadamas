import { expect, test } from '@playwright/test'
import { isHexColor, paletteFromHex, resolveSchoolPalette } from '../lib/school-theme'

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('isHexColor accepts only #rrggbb', () => {
  expect(isHexColor('#7C3AED')).toBe(true)
  expect(isHexColor('7c3aed')).toBe(false)
  expect(isHexColor('#fff')).toBe(false)
  expect(isHexColor('red')).toBe(false)
})

for (const input of ['#7c3aed', '#fde047', '#0a0a0a']) {
  test(`paletteFromHex ${input} is valid and accessible`, () => {
    const p = paletteFromHex(input)
    for (const value of Object.values(p)) expect(value).toMatch(/^#[0-9a-f]{6}$/)
    expect(contrast('#ffffff', p.primary)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5)
  })
}

test('resolveSchoolPalette prefers valid customColor, falls back to preset', () => {
  expect(resolveSchoolPalette({ palette: 'coral', customColor: null }).primary).toBe('#641c2b')
  expect(resolveSchoolPalette({ palette: 'coral', customColor: '#7c3aed' })).toEqual(
    paletteFromHex('#7c3aed')
  )
  expect(resolveSchoolPalette({ palette: 'coral', customColor: 'nope' }).primary).toBe('#641c2b')
})
