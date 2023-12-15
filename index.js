const express = require('express');
const cors = require("cors");

const app = express();

app.use(cors());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://coverlettergenerator-ericstrohmaier.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

async function scrapeSection(url) {
  let options = {};
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
    const browser = await puppeteer.launch(options);
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
    message: "Hello World!",
  });
});

app.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.json({
      error: "You need to provide a URL.",
    });
  }
  try {
    const scrapedContent = await scrapeSection(url);
    res.json({
      content: scrapedContent,
    });
  } catch (error) {
    res.json({
      error: "Something went wrong while scraping the page.",
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started at http://localhost:3000");
});

module.exports = app;
