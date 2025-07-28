import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '@iconify/utils';
import 'consola';

const health_get = defineEventHandler(async () => {
  return {
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "figgy-web-nuxt"
  };
});

export { health_get as default };
//# sourceMappingURL=health.get.mjs.map
