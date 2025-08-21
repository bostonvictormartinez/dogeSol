const puppeteer = require('puppeteer');

const url = 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-5/subpart-B/section-5.25';

async function fetchArticle() {
     console.log(`url: ${url}`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const fullText = await page.evaluate(() => {
    return document.body.innerText || '';
  });

  await browser.close();

  const wordCount = fullText.trim().split(/\s+/).length;

  console.log(` URL: ${url}`);
  console.log(`Word Count: ${wordCount}`);
  console.log(`Preview:\n${fullText.slice(0, 500)}...`);
}

fetchArticle();
