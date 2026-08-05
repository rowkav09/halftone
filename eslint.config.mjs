import nextVitals from "eslint-config-next/core-web-vitals";

// This workspace can contain other checked-out projects. Lint Halftone only.
const config = [
  { ignores: ["GitAscii/**", "docs/**", "github-profile-stats-review/**", "musearr/**"] },
  ...nextVitals,
  // The sole image element is a local object URL from the user's clipboard/upload.
  { files: ["src/app/page.tsx"], rules: { "@next/next/no-img-element": "off" } },
];

export default config;
