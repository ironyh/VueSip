# VueSip Interactive Playground

An interactive web-based playground for exploring and experimenting with VueSip composables.

## Overview

The VueSip Interactive Playground provides a user-friendly environment for developers and users to:

- 🎯 **Try Live Demos**: Interactive examples of VueSip features
- 💻 **View Code Examples**: See how to implement each feature with code snippets
- 📚 **Learn Setup**: Step-by-step guides for integrating VueSip
- 🎮 **Experiment**: Test features with your own SIP server

## Features

### Available Demos

1. **Basic Audio Call**
   - Connect to a SIP server
   - Make and receive audio calls
   - Call controls (mute, hold, hangup)
   - Perfect for getting started with VueSip

2. **DTMF Tones**
   - Send dialpad tones during active calls
   - Interactive keypad interface
   - Sequence sending with delays
   - Essential for IVR navigation

3. **Audio Devices**
   - Enumerate audio input/output devices
   - Select microphones and speakers
   - Real-time device switching
   - Important for user customization

## Running the Playground

### Development Mode

```bash
# From the project root
npm run dev

# Or using pnpm
pnpm dev
```

The playground will be available at `http://localhost:5173`

### Building for Production

```bash
# Build the library and playground
npm run build

# Preview the production build
npm run preview
```

## Project Structure

```
playground/
├── PlaygroundApp.vue    # Main playground application
├── main.ts              # Application entry point
├── style.css            # Global styles
├── demos/               # Demo components
│   ├── BasicCallDemo.vue
│   ├── DtmfDemo.vue
│   └── AudioDevicesDemo.vue
└── README.md           # This file
```

## Using the Playground

### 1. Select an Example

Click on any example in the sidebar to load it:
- Basic Audio Call
- DTMF Tones
- Audio Devices

### 2. Choose a Tab

- **Live Demo**: Interactive demonstration of the feature
- **Code Examples**: Code snippets showing implementation
- **Setup Guide**: Installation and configuration instructions

### 3. Connect and Test

For demos that require a SIP connection:

1. Enter your SIP server details (WebSocket URI, SIP URI, password)
2. Click "Connect to Server"
3. Once connected and registered, you can use the demo features

### Testing Requirements

To fully test the playground, you'll need:

- A SIP server (Asterisk, FreeSWITCH, or hosted service)
- WebRTC-capable browser (Chrome 90+, Firefox 88+, Safari 14+)
- Microphone permissions granted
- Valid SIP credentials

### Free SIP Services for Testing

If you don't have a SIP server, you can use these free services:

- [Antisip](https://www.antisip.com/) - Free SIP service
- [sipgate.io](https://www.sipgate.io/) - Developer SIP service
- Set up a local Asterisk server using Docker

## Development

### Adding New Demos

1. Create a new Vue component in `playground/demos/`
2. Add the demo to the `examples` array in `PlaygroundApp.vue`
3. Define code snippets and setup guide
4. Test the demo thoroughly

Example structure:

```typescript
{
  id: 'your-demo',
  icon: '🎨',
  title: 'Your Demo Title',
  description: 'Brief description',
  tags: ['Tag1', 'Tag2'],
  component: YourDemoComponent,
  setupGuide: '<p>Setup instructions</p>',
  codeSnippets: [
    {
      title: 'Snippet Title',
      description: 'What this code does',
      code: `// Your code example`
    }
  ]
}
```

### Styling Guidelines

- Use CSS custom properties defined in `style.css`
- Follow the existing color scheme
- Ensure responsive design (mobile-friendly)
- Maintain accessibility (ARIA labels, keyboard navigation)

## Architecture

The playground is built using:

- **Vue 3** with Composition API
- **TypeScript** for type safety
- **Vite** for fast development and building
- **VueSip** composables imported from the main library

Each demo component imports composables directly from the `src/` directory, ensuring the playground always uses the latest development version of VueSip.

## Tips for Contributors

1. **Keep demos simple**: Focus on one feature per demo
2. **Add helpful tips**: Include context and explanations
3. **Provide code examples**: Show both basic and advanced usage
4. **Test thoroughly**: Verify all features work as expected
5. **Document setup**: Explain any prerequisites clearly

## Troubleshooting

### Connection Issues

- Verify your SIP server WebSocket URL is correct (must start with `wss://` or `ws://`)
- Check that your SIP credentials are valid
- Ensure your firewall allows WebSocket connections
- Test with a different SIP server if problems persist

### Audio Issues

- Grant microphone permissions when prompted
- Check your browser's audio settings
- Verify the correct audio devices are selected
- Test your audio hardware with other applications

### Browser Compatibility

The playground requires modern browser features:
- WebRTC support
- WebSocket support
- getUserMedia API
- AudioContext API

Recommended browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Contributing

Contributions to improve the playground are welcome! Please:

1. Test your changes thoroughly
2. Follow the existing code style
3. Update documentation as needed
4. Submit a pull request with a clear description

## License

Same as VueSip - MIT License

## Support

- 📚 [VueSip Documentation](/docs)
- 💻 [GitHub Repository](https://github.com/ironyh/VueSip)
- 📦 [NPM Package](https://www.npmjs.com/package/vuesip)

---

**Note**: The playground is designed for development and testing. For production applications, build custom components using VueSip composables tailored to your specific needs.
