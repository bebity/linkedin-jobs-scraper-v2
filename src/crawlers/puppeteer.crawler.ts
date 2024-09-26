// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
import {
  BrowserName,
  DeviceCategory,
  OperatingSystemsName,
  PuppeteerCrawler,
} from 'crawlee';
import puppeteerExtra from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ListSearch } from '../search/list.search.js';
import {
  AbstractSearch,
  ISearch,
  SearchType,
} from '../search/search.abstract.js';
import { SearchFactory } from '../search/search.factory.js';

const proxyConfiguration = await Actor.createProxyConfiguration();

(puppeteerExtra as any).use(stealthPlugin());

const crawler = new PuppeteerCrawler({
  proxyConfiguration,
  maxRequestRetries: 5,
  // maxRequestsPerCrawl: 1,

  // Sessions
  useSessionPool: true,
  persistCookiesPerSession: true,

  launchContext: {
    launcher: puppeteerExtra,
    launchOptions: {
      headless: true,
    },
  },

  browserPoolOptions: {
    useFingerprints: true, // this is the default
    fingerprintOptions: {
      fingerprintGeneratorOptions: {
        browsers: [BrowserName.safari],
        devices: [DeviceCategory.mobile],
        operatingSystems: [OperatingSystemsName.ios],
        locales: ['en-US'],
      },
    },
  },

  requestHandler: async (handle) => {
    const {
      session,
      page,
      request: { userData, ...req },
    } = handle;
    const search = SearchFactory.fromSearch(userData.search);

    console.log('search', search);

    const content = await page?.content();

    search.writeFile(`./process/${search.getHtmlPath()}`, content);
    await page.screenshot({ path: `./process/${search.getScreenshotPath()}` });

    // if (search.type == SearchType.LIST_SEARCH) {
    // const listSearch = search.as(ListSearch);

    await search.resolveSearch({ puppeteer: page });

    if (search.type === SearchType.LIST_SEARCH) {
      for (const job of search.as(ListSearch)?.output || []) {
        await addSearch(SearchFactory.details(job));
      }
    }

    // if (!search.input?.start) {
    //   await addSearch(listSearch.getNext(25));
    // }
    // }
  },
});

export const addSearch = async (
  search:
    | (AbstractSearch<any, any> | ISearch<any, any>)[]
    | AbstractSearch<any, any>
    | ISearch<any, any>,
) => {
  const searchArray = (Array.isArray(search) ? search : [search]).map((s) => {
    if (s instanceof AbstractSearch) {
      return s.toSearch();
    }
    return s;
  });
  await crawler.addRequests(
    searchArray.map((s) => ({
      url: s.url,
      uniqueKey: s.id,
      userData: {
        search: s,
      },
    })),
  );
  if (!crawler.running) {
    await crawler.run();
  }
};
