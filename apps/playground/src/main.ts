import { createApp } from 'vue'
import { createXrUi, darkTheme } from 'vue-xr-ui'
import App from './App.vue'
import './style.css'

createApp(App).use(createXrUi({ theme: darkTheme })).mount('#app')
