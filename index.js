const express = require("express");
const cors = require("cors");

const app = express();
require("dotenv").config();

app.use(cors());

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://coverlettergenerator-ericstrohmaier.vercel.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});
let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  // puppeteer = require("puppeteer-core");
  puppeteer = require('puppeteer-extra')
  console.log("hello aws?!");

} else {
  // puppeteer = require("puppeteer");
  puppeteer = require('puppeteer-extra')
  console.log("not aws");
}
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

async function scrapeSection(url) {
  let options = {};
  let browser;
  const auth = process.env.SUPERPROXY_AUTH;
  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }
  
  try {
    // browser = await puppeteer.connect({
    //   browserWSEndpoint: `wss://${auth}@brd.superproxy.io:9222`,
    // });
    // console.log(browser);
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    await page.goto(url);
    await page.waitForSelector("body");

    // Extract the plain HTML content of the specific section
    const sectionContent = await page.evaluate(() => {
      const section = document.querySelector("body");
      if (section && "innerText" in section) {
        return section.innerText;
      } else {
        throw new Error("Section content not found on the page.");
      }
    });

    if (sectionContent) {
      // Remove the \n characters and unnecessary spaces
      const cleanedContent = sectionContent
        .replace(/\n/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return cleanedContent;
    } else {
      console.log("Section content not found on the page.");
    }
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "Hello World! Use /scrape?url=https://example.com to scrape a page content.",
  });
});

app.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.json({
      error: "You need to provide a URL. /scrape?url=https://example.com",
    });
  }
  try {
    const scrapedContent = await scrapeSection(url);
    res.send(scrapedContent);
  } catch (error) {
    res.json({
      error: "Something went wrong while scraping the page.",
    });
  }
});

app.listen(process.env.PORT || 3003, () => {
  console.log(`Server listening on port ${process.env.PORT || 3003}`);
});

module.exports = app;
