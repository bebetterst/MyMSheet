import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      // 可按需添加项目规则
    },
  },
];
