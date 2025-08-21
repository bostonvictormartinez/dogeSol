const puppeteer = require('puppeteer');

const url = 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-5/subpart-B/section-5.25';

async function fetchArticle() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const fullText = await page.evaluate(() => {
    return document.body.innerText || '';
  });

  await browser.close();

  const wordCount = fullText.trim().split(/\s+/).length;

  console.log(`scraped URL: ${url}`);
  console.log(`Count: ${wordCount}`);
  console.log(`review:\n${fullText.slice(0, 500)}...`);
}

fetchArticle();
