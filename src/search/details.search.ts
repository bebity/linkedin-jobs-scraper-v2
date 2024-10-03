import { Page } from 'puppeteer';
import { JobDto, JobLightDto } from '../dtos/linkedin-response.dto.js';
import { AbstractSearch, SearchType } from './search.abstract.js';
import { convert } from 'html-to-text';
import { Actor, log } from 'apify';

export class DetailsSearch extends AbstractSearch<JobLightDto, JobDto> {
  type = SearchType.JOB_DETAILS;

  maxBlankPageCount = 30;

  getUrl() {
    const id = this.input.id;

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

  protected async getJobUrlFromPage(page: Page): Promise<string | undefined> {
    const div = await page.$(
      'a[data-tracking-control-name="public_jobs_topcard-title"]',
    );
    const content = await div?.evaluate((el) => el.getAttribute('href'));
    return content?.trim() || undefined;
  }

  protected async getJobTitleFromPage(page: Page): Promise<string | undefined> {
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

  protected async getLocationFromPage(page: Page): Promise<string | undefined> {
    const divs = await page.$$('.topcard__flavor');
    const div = await divs?.[1]?.evaluate((el) => el.textContent);
    return div?.trim() || undefined;
  }

  protected async getPostedTimeFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$(
      '.posted-time-ago__text.topcard__flavor--metadata',
    );
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
    const div = await page.$(
      '.description__job-criteria-list .description__job-criteria-item:nth-child(2) .description__job-criteria-text',
    );
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getExperienceLevelFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$(
      '.description__job-criteria-list .description__job-criteria-item:nth-child(1) .description__job-criteria-text',
    );
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getWorkTypeFromPage(page: Page): Promise<string | undefined> {
    const div = await page.$(
      '.description__job-criteria-list .description__job-criteria-item:nth-child(3) .description__job-criteria-text',
    );
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getSectorFromPage(page: Page): Promise<string | undefined> {
    const div = await page.$(
      '.description__job-criteria-list .description__job-criteria-item:nth-child(4) .description__job-criteria-text',
    );
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  protected async getProfileUrlFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('.message-the-recruiter__cta');
    const content = await div?.evaluate((el) => el.getAttribute('href'));
    const urlParams = new URLSearchParams(content?.split('?')?.[1]);
    const redirectUrl = urlParams.get('session_redirect');
    if (redirectUrl) {
      return redirectUrl || undefined;
    }
    return undefined;
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
    return (
      convert(content, {
        wordwrap: null,
      }) || undefined
    );
  }

  protected async getApplyUrlFromPage(page: Page): Promise<string | undefined> {
    let applyUrl: string | undefined;
    const div = await page.$('code#applyUrl');
    const applyUrlExternal = await div?.evaluate((el) => el.innerHTML);
    const urlMatch = applyUrlExternal?.match(/https?:\/\/[^\s"]+/);

    if (urlMatch) {
      try {
        const url = new URL(urlMatch[0]);
        const params = new URLSearchParams(url.search);
        applyUrl = params.get('url') || undefined;
      } catch (error) {
        log.error('Error parsing external apply url', { error });
      }
    }
    return applyUrl;
  }

  protected async getCompanyIdFromPage(
    page: Page,
  ): Promise<string | undefined> {
    const div = await page.$('h4 > a');
    const content = (
      await div?.evaluate((el) => el.getAttribute('href'))
    )?.match?.(/facetCurrentCompany%3D(\d+)/);
    return content ? content[1] || undefined : undefined;
  }

  protected async getSalaryFromPage(page: Page): Promise<string | undefined> {
    const div = await page.$('.job-search-card__salary-info');
    const content = await div?.evaluate((el) => el.textContent);
    return content?.trim() || undefined;
  }

  override async resolvePuppeteerSearch(puppeteer: Page): Promise<JobDto> {
    // await puppeteer.waitForNavigation({ waitUntil: 'load' });

    const job = {
      ...this.input,
      description: await this.nullWrapper(
        () => this.getFormatedDescriptionFromPage(puppeteer),
        'description',
      ),
      jobUrl: await this.nullWrapper(
        () => this.getJobUrlFromPage(puppeteer),
        'jobUrl',
      ),
      jobTitle: await this.nullWrapper(
        () => this.getJobTitleFromPage(puppeteer),
        'jobTitle',
      ),
      companyName: await this.nullWrapper(
        () => this.getCompanyNameFromPage(puppeteer),
        'companyName',
      ),
      location: await this.nullWrapper(
        () => this.getLocationFromPage(puppeteer),
        'location',
      ),
      postedTime: await this.nullWrapper(
        () => this.getPostedTimeFromPage(puppeteer),
        'postedTime',
      ),
      applicationCount: await this.nullWrapper(
        () => this.getApplicationCountFromPage(puppeteer),
        'applicationCount',
      ),
      contractType: await this.nullWrapper(
        () => this.getContractTypeFromPage(puppeteer),
        'contractType',
      ),
      experienceLevel: await this.nullWrapper(
        () => this.getExperienceLevelFromPage(puppeteer),
        'experienceLevel',
      ),
      workType: await this.nullWrapper(
        () => this.getWorkTypeFromPage(puppeteer),
        'workType',
      ),
      sector: await this.nullWrapper(
        () => this.getSectorFromPage(puppeteer),
        'sector',
      ),
      posterProfileUrl: await this.nullWrapper(
        () => this.getProfileUrlFromPage(puppeteer),
        'posterProfileUrl',
      ),
      posterFullName: await this.nullWrapper(
        () => this.getProfileFullNameFromPage(puppeteer),
        'posterFullName',
      ),
      applyUrl: await this.nullWrapper(
        () => this.getApplyUrlFromPage(puppeteer),
        'apply_url',
      ),
      applyType: 'EXTERNAL',
      companyId: await this.nullWrapper(
        () => this.getCompanyIdFromPage(puppeteer),
        'companyId',
      ),
      salary: await this.nullWrapper(
        () => this.getSalaryFromPage(puppeteer),
        'salary',
      ),
    };

    if (!job?.publishedAt && job?.postedTime) {
      // it means job has been published less than 24 hours ago so we set the date to now YYYY-MM-DD
      job.publishedAt = new Date().toISOString().split('T')[0];
    }

    if (!job?.applyUrl && job?.jobUrl) {
      job.applyUrl = job.jobUrl;
      job.applyType = 'EASY_APPLY';
    }

    return job;
  }

  public isBlank() {
    return !this.output?.jobTitle;
  }
}
