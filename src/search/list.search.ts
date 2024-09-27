import { ElementHandle, Page } from 'puppeteer';
import { requestHttpCrawler } from '../crawlers/http.crawler.js';
import {
  JobLightDto,
  LinkedinLocationResponseDto,
} from '../dtos/linkedin-response.dto.js';
import { LinkedinJobSearchWithInternalFiltersInputDto } from '../dtos/linkedin-search.input.js';
import { AbstractSearch, ISearch, SearchType } from './search.abstract.js';
import { DetailsSearch } from './details.search.js';
import { log } from 'apify';

export class ListSearch extends AbstractSearch<
  LinkedinJobSearchWithInternalFiltersInputDto,
  JobLightDto[]
> {
  type = SearchType.LIST_SEARCH;

  maxBlankPageCount = 5;

  lastLiCount = 0;

  aggregatedCount = 0;

  setAgregatedCount(count: number) {
    this.aggregatedCount = count;
    return this;
  }

  getUrl() {
    // console.log('getUrl', this.input);
    const url = new URL(
      'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?',
    );
    const excludeKeys = ['searchLocation', 'searchCompany', 'rows'];
    Object.entries(this.input || {}).forEach(([key, value]) => {
      if (value && !excludeKeys.includes(key)) {
        url.searchParams.append(key, value.toString());
      }
    });
    return url.toString();
  }

  async addExtrasToUrl(): Promise<this> {
    const location = await this.searchLocation();
    this.input = {
      ...(this.input || {}),
      location: location?.displayName,
      geoId: location?.geoId,
      searchCompany: undefined,
      f_C: await this.searchCompany(),
    };
    return this.buildUrl();
  }

  protected async searchLocation(): Promise<{
    displayName: string;
    geoId: string;
  } | undefined> {
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
    log.info(
      `Finding for area: ${firstElement?.displayName ?? location}`,
  );
    return {displayName: firstElement.displayName, geoId: firstElement.id};
  }

  protected async searchCompany(): Promise<string | undefined> {
    const searchCompany = this.input?.searchCompany || [];

    const promises = searchCompany.map(async (company) => {
      const res = await requestHttpCrawler<any[]>(
        `https://linkedin.com/jobs-guest/api/typeaheadHits?typeaheadType=COMPANY&query=${encodeURIComponent(
          company,
        )}`,
      );

      const firstElement = res[0] as LinkedinLocationResponseDto | undefined;
      if (!firstElement) {
        log.warning(
          `⚠️ Company ${searchCompany} not found, be sure it is written correctly. (Results may be affected) ⚠️`,
        );
        return undefined;
      }
      return firstElement.id;
    });

    const res = (await Promise.all(promises)).filter(Boolean);

    return res.join(',');
  }

  getNext(resultsNbMoreToSkip: number) {
    const newInput = {
      ...this.input,
      start: (this.input?.start || 0) + resultsNbMoreToSkip,
      blankPageCount: 0,
    };
    return new ListSearch(newInput);
  }

  async saveData() {
    this.aggregatedCount += this.output?.length || 0;
  }

  override toSearch(): ISearch<
    LinkedinJobSearchWithInternalFiltersInputDto,
    JobLightDto[]
  > {
    return {
      ...super.toSearch(),
      aggregatedCount: this.aggregatedCount,
    };
  }

  override getName(opt?: { unique?: boolean }) {
    return `${this.type}_${this.input?.start || 0}${opt?.unique ? `_${this.id}` : ''}`;
  }

  override getNextSearch(): AbstractSearch<any, any>[] {
    const result = [];
    for (const job of this.output || []) {
      result.push(new DetailsSearch(job));
    }

    const maxLimit = Math.min(this.input?.rows || 999, 999);

    if (this.aggregatedCount < maxLimit) {
      const nextCount = this.lastLiCount + this.aggregatedCount;

      if (nextCount < maxLimit) {
        result.push(this.getNext(this.lastLiCount));
      } else if (this.aggregatedCount < maxLimit) {
        const remaining = maxLimit - this.aggregatedCount;
        if (remaining > 0) {
          result.push(this.getNext(remaining));
        }
      }
    }

    return result;
  }

  protected async getIdFromLIElement(
    page: Page,
    li: ElementHandle<HTMLLIElement>,
  ): Promise<string | undefined> {
    const div = await li.$('div[data-entity-urn]');
    const content = await div?.evaluate((el) =>
      el.getAttribute('data-entity-urn'),
    );
    return content?.split(':')?.reverse()?.[0] || undefined;
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
    return url ? new URL(url).href : undefined;
  }

  protected override async resolvePuppeteerSearch(
    puppeteer: Page,
  ): Promise<JobLightDto[]> {
    const mainList = await puppeteer.$$('li');
    if (!mainList) {
      throw new Error('No main list found');
    }

    this.lastLiCount = mainList.length;

    // console.log('resolvePuppeteerSearch mainList', mainList.length);

    const rslt: JobLightDto[] = [];
    for (const li of mainList) {
      const id = await this.nullWrapper(
        () => this.getIdFromLIElement(puppeteer, li),
        'id',
      );
      if (!id) {
        continue;
      }
      rslt.push({
        id,
        title: await this.nullWrapper(
          () => this.getTitleFromLIElement(puppeteer, li),
          'title',
        ),
        companyName: await this.nullWrapper(
          () => this.getCompanyNameFromLIElement(puppeteer, li),
          'companyName',
        ),
        companyURL: await this.nullWrapper(
          () => this.getCompanyURLFromLIElement(puppeteer, li),
          'companyURL',
        ),
        publishedAt: await this.nullWrapper(
          () => this.getPublishedDateFromLIElement(puppeteer, li),
          'publishedAt',
        ),
      });
    }
    return rslt;
  }

  public isBlank() {
    return !this.output?.length;
  }
}
