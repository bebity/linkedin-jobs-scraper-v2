import { createId } from '@paralleldrive/cuid2';
import { Actor } from 'apify';
import { HttpCrawler, Source } from 'crawlee';
import { InputDto } from '../dtos/scraper.input.js';

const resolvers: Record<
  string,
  { resolve: (data: any) => void; reject: (data: any) => void }
> = {};

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

const crawler = new HttpCrawler({
  // The crawler downloads and processes the web pages in parallel, with a concurrency
  // automatically managed based on the available system memory and CPU (see AutoscaledPool class).
  // Here we define some hard limits for the concurrency.
  //   minConcurrency: 10,
  //   maxConcurrency: 50,

  // On error, retry each page at most once.
  proxyConfiguration,
  maxRequestRetries: 5,

  // Increase the timeout for processing of each page.
  requestHandlerTimeoutSecs: 30,

  // Limit to 10 requests per one crawl
  maxRequestsPerCrawl: 10,
  additionalMimeTypes: ['text/plain'],
  useSessionPool: true,
  persistCookiesPerSession: true,

  // This function will be called for each URL to crawl.
  // It accepts a single parameter, which is an object with options as:
  // https://crawlee.dev/api/http-crawler/interface/HttpCrawlerOptions#requestHandler
  // We use for demonstration only 2 of them:
  // - request: an instance of the Request class with information such as the URL that is being crawled and HTTP method
  // - body: the HTML code of the current page
  async requestHandler({ request, body: tmpBody }) {
    const next = resolvers[request.uniqueKey];
    if (next) {
      const body =
        request.userData?.toJson !== false
          ? JSON.parse(tmpBody.toString())
          : tmpBody;
      next.resolve(body);
    }
  },

  // This function is called if the page processing failed more than maxRequestRetries + 1 times.
  failedRequestHandler({ request }, error: Error) {
    const next = resolvers[request.uniqueKey];
    if (next) {
      next.reject(error);
    }
  },
});

export const requestHttpCrawler = <T = any>(
  req: string | Omit<Source, 'userData'>,
  opt?: { toJson?: false },
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const id = createId();
    resolvers[id] = { resolve, reject };
    crawler.addRequests([
      {
        ...(typeof req === 'string' ? { url: req } : req),
        uniqueKey: id,
        userData: opt,
      },
    ]);
    if (!crawler.running) {
      crawler.run();
    }
  });
};
