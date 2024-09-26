import { Actor } from 'apify';
import { LinkedinJobSearchInputDto } from '../dtos/linkedin-search.input.js';
import { InputDto } from '../dtos/scraper.input.js';

export class BaseScaper {
  constructor(protected readonly input: InputDto) {}

  async getProxyConfiguration() {
    const { proxy } = this.input;
    return await Actor.createProxyConfiguration({
      useApifyProxy: proxy?.useApifyProxy,
      apifyProxyGroups: proxy?.apifyProxyGroups,
      apifyProxyCountry: proxy?.apifyProxyCountry,
      proxyUrls: proxy?.proxyUrls,
    });
  }

  async buildUrl(opt: LinkedinJobSearchInputDto = {}) {
    const url = new URL(
      'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?',
    );
    Object.entries(opt).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
  }
}
