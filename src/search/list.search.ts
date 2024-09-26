import { ElementHandle, Page } from 'puppeteer';
import { requestHttpCrawler } from '../crawlers/http.crawler.js';
import {
  JobLightDto,
  LinkedinLocationResponseDto,
} from '../dtos/linkedin-response.dto.js';
import { LinkedinJobSearchWithInternalFiltersInputDto } from '../dtos/linkedin-search.input.js';
import { AbstractSearch, SearchType } from './search.abstract.js';

export class ListSearch extends AbstractSearch<
  LinkedinJobSearchWithInternalFiltersInputDto | undefined,
  JobLightDto[]
> {
  type = SearchType.LIST_SEARCH;

  getUrl() {
    // console.log('getUrl', this.input);
    const url = new URL(
      'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?',
    );
    const excludeKeys = ['searchLocation', 'searchCompany'];
    Object.entries(this.input || {}).forEach(([key, value]) => {
      if (value && !excludeKeys.includes(key)) {
        url.searchParams.append(key, value.toString());
      }
    });
    return url.toString();
  }

  async addExtrasToUrl(): Promise<this> {
    this.input = {
      ...(this.input || {}),
      location: await this.searchLocation(),
      searchLocation: undefined,
    };
    return this.buildUrl();
  }

  protected async searchLocation(): Promise<string | undefined> {
    const { searchLocation } = this.input || {};
    if (!searchLocation) {
      return undefined;
    }
    const res = await requestHttpCrawler<any[]>(
      `https://linkedin.com/jobs-guest/api/typeaheadHits?query=${encodeURIComponent(searchLocation)}&typeaheadType=GEO&geoTypes=POPULATED_PLACE,ADMIN_DIVISION_2,MARKET_AREA,COUNTRY_REGION`,
    );
    const firstElement = res[0] as LinkedinLocationResponseDto | undefined;
    if (!firstElement) {
      return undefined;
    }
    return encodeURI(`${firstElement.displayName}${firstElement.id}`);
  }

  getNext(resultsNbMoreToSkip: number) {
    const newInput = {
      ...this.input,
      start: (this.input?.start || 0) + resultsNbMoreToSkip,
    };
    return new ListSearch(newInput);
  }

  override getName(opt?: { unique?: boolean }) {
    return `${this.type}_${this.input?.start || 0}${opt?.unique ? `_${this.id}` : ''}`;
  }

  protected async getIdFromLIElement(
    page: Page,
    li: ElementHandle<HTMLLIElement>,
  ): Promise<string | undefined> {
    const div = await li.$('div[data-entity-urn]');
    const content = await div?.evaluate((el) =>
      el.getAttribute('data-entity-urn'),
    );
    return content || undefined;
  }

  protected async getPublishedDateFromLIElement(
    page: Page,
    li: ElementHandle<HTMLLIElement>,
  ): Promise<string | undefined> {
    const div = await li.$('.job-search-card__listdate');
    const content = await div?.evaluate((el) => el.getAttribute('datetime'));
    return content || undefined;
  }

  protected async getSalaryFromLIElement(
    page: Page,
    li: ElementHandle<HTMLLIElement>,
  ): Promise<string | undefined> {
    const div = await li.$('.job-search-card__salary-info');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.replace(/\s/g, '')?.trim() || undefined;
  }

  protected async getTitleFromLIElement(
    page: Page,
    li: ElementHandle<HTMLLIElement>,
  ): Promise<string | undefined> {
    const span = await li.$('.sr-only');
    const content = await span?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getCompanyNameFromLIElement(
    page: Page,
    li: ElementHandle<HTMLLIElement>,
  ): Promise<string | undefined> {
    const div = await li.$('.hidden-nested-link');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getCompanyURLFromLIElement(
    page: Page,
    li: ElementHandle<HTMLLIElement>,
  ): Promise<string | undefined> {
    const div = await li.$('.hidden-nested-link');
    const url =
      (await div?.evaluate((el) => el.getAttribute('href'))) || undefined;
    return url ? new URL(url).pathname : undefined;
  }

  protected override async resolvePuppeteerSearch(
    puppeteer: Page,
  ): Promise<JobLightDto[]> {
    const mainList = await puppeteer.$$('li');
    if (!mainList) {
      throw new Error('No main list found');
    }

    console.log('resolvePuppeteerSearch mainList', mainList.length);

    const rslt: JobLightDto[] = [];
    for (const li of mainList) {
      const id = await this.getIdFromLIElement(puppeteer, li);
      if (!id) {
        continue;
      }
      rslt.push({
        id,
        title: await this.getTitleFromLIElement(puppeteer, li),
        companyName: await this.getCompanyNameFromLIElement(puppeteer, li),
        companyURL: await this.getCompanyURLFromLIElement(puppeteer, li),
        publishedDate: await this.getPublishedDateFromLIElement(puppeteer, li),
      });
    }

    console.log('resolvePuppeteerSearch rslt', rslt.length);
    return rslt;
  }
}
