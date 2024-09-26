import { LinkedinJobSearchInputDto } from '../dtos/linkedin-search.input.js';

export enum LinkedinCrawlType {
  JOB_SEARCH = 'JOB_SEARCH',
  JOB_DETAILS = 'JOB_DETAILS',
}

export type LinkedinCrawlerContextInput =
  | {
      type: LinkedinCrawlType.JOB_SEARCH;
      input?: LinkedinJobSearchInputDto;
    }
  | {
      type: LinkedinCrawlType.JOB_DETAILS;
      input: { jobId: string };
    };

export interface ILinkedinCrawlerContext {
  type: LinkedinCrawlType;

  input: LinkedinCrawlerContextInput['input'];

  url: string;
}

export class LinkedinCrawlerContext implements ILinkedinCrawlerContext {
  type: LinkedinCrawlType;

  input: LinkedinCrawlerContextInput['input'];

  url: string;

  constructor(input: LinkedinCrawlerContextInput) {
    this.type = input.type;
    this.input = input.input;
    this.url = this.byType().buildUrl();
  }

  byType() {
    if (this.type === LinkedinCrawlType.JOB_SEARCH) {
      return this.list;
    }
    return this.details;
  }

  public get details() {
    const buildUrl = () =>
      encodeURI(
        new URL(
          `https://www.linkedin.com/jobs-guest/api/jobPosting/${this.jobId}`,
        ).toString(),
      );

    return {
      input: this.input as { jobId: string },
      buildUrl: buildUrl.bind(this),
    };
  }

  public get list() {
    const buildUrl = () => {
      const url = new URL(
        'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?',
      );
      Object.entries(this.input || {}).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });
      return encodeURI(url.toString());
    };

    return {
      input: this.input as LinkedinJobSearchInputDto,
      buildUrl: buildUrl.bind(this),
    };
  }

  public get toJson(): ILinkedinCrawlerContext {
    return {
      type: this.type,
      input: this.input,
      url: this.url,
    };
  }

  static new(
    data: ILinkedinCrawlerContext | LinkedinCrawlerContext,
  ): LinkedinCrawlerContext {
    return new LinkedinCrawlerContext({
      type: data.type,
      input: data.input,
    } as any);
  }
}
