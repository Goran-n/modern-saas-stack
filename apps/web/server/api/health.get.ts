export default defineEventHandler(async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "figgy-web-nuxt",
  };
});
