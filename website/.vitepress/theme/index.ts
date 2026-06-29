import type { App } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'
import FlowDiagram from './components/FlowDiagram.vue'
import TerminalHero from './components/TerminalHero.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component('FlowDiagram', FlowDiagram)
    app.component('TerminalHero', TerminalHero)
  },
}
