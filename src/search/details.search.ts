import { Page } from 'puppeteer';
import { JobDto, JobLightDto } from '../dtos/linkedin-response.dto.js';
import { AbstractSearch, SearchType } from './search.abstract.js';

export class DetailsSearch extends AbstractSearch<JobLightDto, JobDto> {
  type = SearchType.JOB_DETAILS;

  getUrl() {
    const url = new URL(
      'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?',
    );
    Object.entries(this.input).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }

  override getName(opt?: { unique?: boolean }) {
    return `${this.type}_${this.input.id}${opt?.unique ? `_${this.id}` : ''}`;
  }

  override async resolvePuppeteerSearch(puppeteer: Page): Promise<JobDto> {
    return this.input;
  }
}
