import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'VueSip',
  description: 'A headless Vue.js component library for SIP/VoIP applications',
  base: '/',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is VueSip?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'User Guides',
          items: [
            { text: 'Making Calls', link: '/guide/making-calls' },
            { text: 'Receiving Calls', link: '/guide/receiving-calls' },
            { text: 'Call Controls', link: '/guide/call-controls' },
            { text: 'Device Management', link: '/guide/device-management' },
            { text: 'Call History', link: '/guide/call-history' },
            { text: 'Presence & Messaging', link: '/guide/presence-messaging' },
            { text: 'Video Calling', link: '/guide/video-calling' },
          ],
        },
        {
          text: 'Advanced Topics',
          items: [
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Security Best Practices', link: '/guide/security' },
            { text: 'Performance Optimization', link: '/guide/performance' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Composables',
          items: [
            { text: 'useSipClient', link: '/api/use-sip-client' },
            { text: 'useCallSession', link: '/api/use-call-session' },
            { text: 'useMediaDevices', link: '/api/use-media-devices' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ironyh/VueSip' },
    ],

    search: {
      provider: 'local',
    },
  },
})
