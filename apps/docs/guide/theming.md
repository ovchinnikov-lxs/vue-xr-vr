# Theming

A theme is a plain object of design tokens: colours, radius, spacing,
typography and interaction sizes. Two come built in, `darkTheme` and
`lightTheme`.

```ts
app.use(createXrUi({ theme: darkTheme }))
```

## One accent colour

`withAccent(theme, hex)` derives the hover, pressed, text-on-accent (by
contrast) and focus colours from one value:

```ts
import { darkTheme, withAccent } from 'vue-xr-ui'
const green = withAccent(darkTheme, '#22c55e')
```

## Switching at runtime

```ts
const theme = useXrTheme()
theme.value = lightTheme
```

## A theme for part of the scene

```vue
<XrThemeProvider accent="#f43f5e">
  <XrButton>Delete</XrButton>
</XrThemeProvider>
```

## Your own theme

```ts
import { defineTheme, darkTheme } from 'vue-xr-ui'

export const brand = defineTheme(darkTheme, {
  name: 'brand',
  radius: { md: 16 },
  colors: { surface: '#101826' },
})
```

`@vue-xr-ui/tokens` has the same tokens without Vue, for use in other
renderers.
