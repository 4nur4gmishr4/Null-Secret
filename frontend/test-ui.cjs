const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/app');
  await page.waitForTimeout(4000);
  await page.fill('#message-input', 'hello world');
  await page.click('button:has-text("Secure")');
  await page.waitForTimeout(2000);
  const content = await page.content();
  if (content.includes('Failed to secure your message')) {
    console.log("YES, it failed.");
  } else {
    console.log("No, it succeeded.");
    console.log(page.url());
  }
  await browser.close();
})();