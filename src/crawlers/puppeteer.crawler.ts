// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor, log } from 'apify';
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
import { add } from 'lodash';
import { InputDto } from '../dtos/scraper.input.js';

await Actor.init();
const input = await Actor.getInput<InputDto>();
const proxyConfiguration = input?.proxy
  ? await Actor.createProxyConfiguration({
      useApifyProxy: input?.proxy?.useApifyProxy,
      apifyProxyGroups: input?.proxy?.apifyProxyGroups,
      apifyProxyCountry: input?.proxy?.apifyProxyCountry,
      proxyUrls: input?.proxy?.proxyUrls,
    })
  : await Actor.createProxyConfiguration({
      groups: ['RESIDENTIAL'],
    });

(puppeteerExtra as any).use(stealthPlugin());

const crawler = new PuppeteerCrawler({
  proxyConfiguration,
  maxRequestRetries: 300,
  // maxRequestsPerCrawl: 1,
  experiments: {
    requestLocking: false,
  },
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
  errorHandler: async ({ request, session }) => {
    // log.error(`Request ${request.url} failed too many times trying...`);
    session?.retire();
  },
  requestHandler: async (handle) => {
    const {
      session,
      page,
      request: { userData, ...req },
    } = handle;
    const search = SearchFactory.fromSearch(userData.search);

    const content = await page?.content();

    search.writeFile(`./process/${search.getHtmlPath()}`, content);
    await page.screenshot({ path: `./process/${search.getScreenshotPath()}` });

    // if (search.type == SearchType.LIST_SEARCH) {
    // const listSearch = search.as(ListSearch);

    await search.resolveSearch({ puppeteer: page });

    if (search.isBlank()) {
      search.incrementBlankPageCount();
      if (search.isMaxBlankPage()) {
        log.error('Too many blank pages');
        throw Error('Too many blank pages');
      }
    }

    await search.saveData();

    await addSearch(search.getNextSearch());

    // if (search.type === SearchType.LIST_SEARCH) {
    //   const responseLength = search.as(ListSearch)?.output?.length || 0;
    //   for (const job of search.as(ListSearch).output || []) {
    //     await addSearch(SearchFactory.details(job));
    //   }
    // if (!responseLength) {
    //   console.log('NO JOBS', search.as(ListSearch)?.output);
    //   if (search.as(ListSearch).blankPageCount > 3) {
    //     throw Error('Too many blank pages');
    //   }
    //   // await addSearch(SearchFactory.list(search.as(ListSearch).incrementBlankPageCount().toSearch()));
    // }

    // else {
    //   await addSearch(search.as(ListSearch).getNext(responseLength));
    // }
    // }

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
