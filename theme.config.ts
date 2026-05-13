import { defineThemeConfig } from '@utils/defineThemeConfig'
import previewImage from '@assets/img/social-preview-image.png'
import logoImage from '@assets/img/Logo.svg'

export default defineThemeConfig({
  name: 'South Asian Women in Rare',
  id: 'south-asian-women-in-rare',
  logo: logoImage,
  seo: {
    title: 'South Asian Women in Rare',
    description:
      'A space for women from South Asia to share their experiences, journeys and insights of living with or supporting someone with a rare disease.',
    author: 'Mehul Dinesh Jain',
    image: previewImage, // Can also be a string e.g. '/social-preview-image.png',
  },
  // colors: {
  //   primary: '#d648ff',
  //   secondary: '#00d1b7',
  //   neutral: '#b9bec4',
  //   outline: '#ff4500',
  // },
  colors: {
    primary: '#e6a23c',//  yellow #e6a23c
    secondary: '#1f6f6b',// Green #1f6f6b
    neutral: '#b9bec4',// Maroon #651f40
    outline: '#000000',// Black #000000
  },
  navigation: {
    darkmode: true,
    items: [
      {
        type: 'link',
        label: 'Home',
        href: '/',
      },
      {
        type: 'link',
        label: 'Episodes',
        href: '/episodes',
      },
      {
        type: 'link',
        label: 'Blog',
        href: '/blog',
      },
      {
        type: 'link',
        label: 'Contact',
        href: '/contact',
      },
      {
        label: 'More',
        type: 'dropdown',
        items: [
          {
            label: 'Sitemap',
            href: '/sitemap',
          },
          {
            label: 'Accessibility statement',
            href: '/accessibility-statement',
          },
        ],
      },
    ],
  },
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/incluud/',
      icon: 'lucide:github',
    },
    {
      label: 'Bluesky',
      href: 'https://bsky.app/profile/incluud.dev',
      icon: 'lucide:bot-message-square',
    },
  ],
})