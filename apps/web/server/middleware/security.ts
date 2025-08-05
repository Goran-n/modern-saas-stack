export default defineEventHandler(async (event) => {
  // Apply security headers to all responses
  const headers = event.node.res;
  
  // Security headers
  headers.setHeader('X-Content-Type-Options', 'nosniff');
  headers.setHeader('X-Frame-Options', 'SAMEORIGIN');
  headers.setHeader('X-XSS-Protection', '1; mode=block');
  headers.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  
  
  // Strict Transport Security (only for HTTPS)
  if (event.node.req.headers['x-forwarded-proto'] === 'https' || event.node.req.url?.startsWith('https://')) {
    headers.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
})