/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./frontend/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        deepBlue: "#08163A",
        lilac: "#A45CFF",
        neonLilac: "#C3FF37",
        neonGreen: "#41FF8D",
        neonYellow: "#F5FF4A",
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(195, 255, 55, 0.45)",
        panel: "0 12px 35px rgba(0, 0, 0, 0.35)",
      },
      animation: {
        pulseFast: "pulse 1.2s ease-in-out infinite",
        spinSlow: "spin 2s linear infinite",
      },
    },
  },
  plugins: [],
};
