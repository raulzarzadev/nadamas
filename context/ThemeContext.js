import { useState, useEffect, useContext, createContext } from 'react'

const ThemeContext = createContext()
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('ligth')
 // const colorTheme = theme === 'dark' ? 'light' : 'dark'
  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove(theme)
    root.classList.add(theme)

    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  console.log(theme)

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  return useContext(ThemeContext)
}
