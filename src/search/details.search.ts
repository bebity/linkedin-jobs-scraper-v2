import { Page } from 'puppeteer';
import { JobDto, JobLightDto } from '../dtos/linkedin-response.dto.js';
import { AbstractSearch, SearchType } from './search.abstract.js';
import { convert } from 'html-to-text';
import { Actor, log } from 'apify';

export class DetailsSearch extends AbstractSearch<JobLightDto, JobDto> {
  type = SearchType.JOB_DETAILS;

  maxBlankPageCount = 30;

  getUrl() {

    const id = this.input.id?.split(':')?.reverse()?.[0];

    if (!id) {
      throw Error('Id is required for DetailsSearch');
    }

    const url = new URL(
      `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`,
    );

    return url.toString();
  }

  override getName(opt?: { unique?: boolean }) {
    return `${this.type}_${this.input.id}${opt?.unique ? `_${this.id}` : ''}`;
  }

  override getNextSearch(): AbstractSearch<any, any>[] {
    if (this.isBlank()) {
      return [this];
    } 
    return [];
  }

  async saveData() {
    if (!this.output?.id) {
      log.warning('No data to save, skipping');
      return;
    }
    if (!this.isBlank() || this.isMaxBlankPage()) {
      await Actor.pushData(this.output);
    }
  }

  protected async getJobUrlFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('a[data-tracking-control-name="public_jobs_topcard-title"]');
    const content = await div?.evaluate((el) => el.getAttribute('href'));
    return content?.trim() || undefined;
  }

  protected async getJobTitleFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.topcard__title');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getCompanyNameFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.topcard__org-name-link');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getLocationFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const divs = await page.$$('.topcard__flavor');
    const div = await divs?.[1]?.evaluate((el) => el.textContent);
    return div?.trim() || undefined;
  }

  protected async getPostedTimeFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.posted-time-ago__text.topcard__flavor--metadata');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getApplicationCountFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.num-applicants__caption');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getContractTypeFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.description__job-criteria-list .description__job-criteria-item:nth-child(2) .description__job-criteria-text');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getExperienceLevelFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.description__job-criteria-list .description__job-criteria-item:nth-child(1) .description__job-criteria-text');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getWorkTypeFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.description__job-criteria-list .description__job-criteria-item:nth-child(3) .description__job-criteria-text');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getSectorFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.description__job-criteria-list .description__job-criteria-item:nth-child(4) .description__job-criteria-text');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getProfileUrlFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.message-the-recruiter__cta');
    const content = await div?.evaluate((el) => el.getAttribute('href'));
    const urlParams = new URLSearchParams(content?.split('?')?.[1]);
    const redirectUrl = urlParams.get('redirectUrl');
    if (redirectUrl) {
      return redirectUrl || undefined
    }
  }

  protected async getProfileFullNameFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.base-main-card__title');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getFormatedDescriptionFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('div.show-more-less-html__markup--clamp-after-5');
    const content = await div?.evaluate((el) => el.innerHTML);
    if (!content) return undefined;
    return convert(content, {
      wordwrap: null
    }) || undefined;
  }
  

  override async resolvePuppeteerSearch(puppeteer: Page): Promise<JobDto> {

    // await puppeteer.waitForNavigation({ waitUntil: 'domcontentloaded' });
    
    const job = {
      ...this.input,
      description: await this.nullWrapper(() => this.getFormatedDescriptionFromPage(puppeteer), 'description'),
      jobUrl: await this.nullWrapper(() => this.getJobUrlFromPage(puppeteer), 'jobUrl'),
      jobTitle: await this.nullWrapper(() => this.getJobTitleFromPage(puppeteer), 'jobTitle'),
      companyName: await this.nullWrapper(() => this.getCompanyNameFromPage(puppeteer), 'companyName'),
      location: await this.nullWrapper(() => this.getLocationFromPage(puppeteer), 'location'),
      postedTime: await this.nullWrapper(() => this.getPostedTimeFromPage(puppeteer), 'postedTime'),
      applicationCount: await this.nullWrapper(() => this.getApplicationCountFromPage(puppeteer), 'applicationCount'),
      contractType: await this.nullWrapper(() => this.getContractTypeFromPage(puppeteer), 'contractType'),
      experienceLevel: await this.nullWrapper(() => this.getExperienceLevelFromPage(puppeteer), 'experienceLevel'),
      workType: await this.nullWrapper(() => this.getWorkTypeFromPage(puppeteer), 'workType'),
      sector: await this.nullWrapper(() => this.getSectorFromPage(puppeteer), 'sector'),
      posterProfileUrl: await this.nullWrapper(() => this.getProfileUrlFromPage(puppeteer), 'posterProfileUrl'),
      posterFullName: await this.nullWrapper(() => this.getProfileFullNameFromPage(puppeteer), 'posterFullName'),
    };

    if (!job?.publishedAt && job?.postedTime) {
      // it means job has been published less than 24 hours ago so we set the date to now YYYY-MM-DD
        job.publishedAt = new Date().toISOString().split('T')[0];
    }

  return job;
      
  }


  public isBlank() {
    return !this.output?.jobTitle;
  }

}
