/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        // Vendor category colors
        ssp: '#3B82F6',      // blue
        dsp: '#8B5CF6',      // purple
        verification: '#F59E0B', // amber
        measurement: '#10B981', // emerald
        cdn: '#6B7280',      // gray
        adserver: '#EF4444', // red
        prebid: '#EC4899',   // pink
        identity: '#06B6D4', // cyan
        other: '#9CA3AF',    // gray
      },
    },
  },
  plugins: [],
};
