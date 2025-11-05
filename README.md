# DailVue

> A headless Vue.js component library for SIP/VoIP applications

[![npm version](https://img.shields.io/npm/v/dailvue.svg)](https://www.npmjs.com/package/dailvue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Headless Architecture** - Full control over your UI
- 🔒 **Type-Safe** - Built with TypeScript
- ⚡ **Modern WebRTC** - High-quality audio and video calls
- 🔌 **Composable** - Vue 3 Composition API based
- 🎨 **Bring Your Own UI** - No imposed styles or components
- 📦 **Lightweight** - Small bundle size with tree-shaking support

## Installation

```bash
# npm
npm install dailvue

# pnpm
pnpm add dailvue

# yarn
yarn add dailvue
```

## Quick Start

```typescript
import { createDailVue } from 'dailvue'
import { createApp } from 'vue'

const app = createApp(App)
app.use(createDailVue())
```

## Documentation

Full documentation is available at [https://dailvue.dev](https://dailvue.dev) (coming soon)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari 14+
- Chrome Android 90+

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build library
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Generate coverage report
pnpm coverage

# Lint code
pnpm lint

# Format code
pnpm format
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE)

## Acknowledgments

Built with:
- [Vue.js](https://vuejs.org/)
- [JsSIP](https://jssip.net/)
- [WebRTC](https://webrtc.org/)
