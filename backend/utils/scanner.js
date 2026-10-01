// Scanner utility - frontend axe-core scan use karta hai
// Puppeteer removed - not needed for Vercel deployment
module.exports = {
  runScan: async (url) => {
    return { success: false, error: 'Direct backend scanning not supported' };
  }
};