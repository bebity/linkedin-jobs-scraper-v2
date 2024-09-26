// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import log from '@apify/log';
import { Actor } from 'apify';
import { addSearch } from './crawlers/puppeteer.crawler.js';
import { SearchFactory } from './search/search.factory.js';

// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';

log.setLevel(log.LEVELS.DEBUG);

interface Input {
  // startUrls: string[];
  // maxRequestsPerCrawl: number;
}

await Actor.init();

const proxyConfiguration = await Actor.createProxyConfiguration();

const search = SearchFactory.list({
  searchLocation: 'United States',
});

await addSearch(search);

// await search.addExtrasToUrl();

// console.log('URL', search.url, search.input);

// const buildUrl = (url: string) => {
//   return 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=Python%2BDeveloper&location=United%2BStates&geoId=103644278&f_TPR=&f_C=66321745&start=50';
// };

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit()
await Actor.exit();
