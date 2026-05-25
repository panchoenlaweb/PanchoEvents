/** @type {import('next').NextConfig} */
const EVENTS = [
  'joongdunk', 'surfjava', 'seakeen', 'dmdland3', 'loveoutloud',
  'olympop', 'perthsanta', 'poohpavel', 'blushblossom', 'sotus',
  'starlympic', 'redworld', 'khemjira',
];

const nextConfig = {
  async rewrites() {
    const rules = [
      { source: '/', destination: '/landing.html' },
    ];
    for (const slug of EVENTS) {
      rules.push({ source: `/${slug}`, destination: `/${slug}/index.html` });
    }
    return rules;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
