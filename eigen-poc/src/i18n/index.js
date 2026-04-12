import en from './en'
import nl from './nl'
import useAppStore from '../stores/appStore'

// Language registry — adding a language is O(1) here + dropping a new dictionary file.
export const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
}

const DICTIONARIES = { en, nl }
export const DEFAULT_LANG = 'en'

function resolve(dict, path) {
  return path.split('.').reduce((obj, key) => {
    if (obj == null) return undefined
    return obj[key]
  }, dict)
}

function interpolate(str, vars) {
  if (typeof str !== 'string' || !vars) return str
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`))
}

// Hook: returns t() + current language + setter. Reactive to language changes.
export function useTranslation() {
  const language = useAppStore((s) => s.language) || DEFAULT_LANG
  const setLanguage = useAppStore((s) => s.setLanguage)
  const dict = DICTIONARIES[language] || DICTIONARIES[DEFAULT_LANG]

  const t = (key, vars) => {
    let value = resolve(dict, key)
    if (value === undefined) {
      // Fallback to English if key missing in current dict
      value = resolve(DICTIONARIES[DEFAULT_LANG], key)
    }
    if (value === undefined) return key // show key for debugging
    if (Array.isArray(value)) return value // caller can map
    return interpolate(value, vars)
  }

  return { t, language, setLanguage, languages: LANGUAGES }
}

// Non-hook accessor (for use outside components)
export function translate(language, key, vars) {
  const dict = DICTIONARIES[language] || DICTIONARIES[DEFAULT_LANG]
  let value = resolve(dict, key)
  if (value === undefined) value = resolve(DICTIONARIES[DEFAULT_LANG], key)
  if (value === undefined) return key
  if (Array.isArray(value)) return value
  return interpolate(value, vars)
}
