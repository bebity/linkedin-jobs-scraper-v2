import { createId } from '@paralleldrive/cuid2';
import * as fs from 'fs';
import { Page } from 'puppeteer';

export enum SearchType {
  LIST_SEARCH = 'LIST_SEARCH',
  JOB_DETAILS = 'JOB_DETAILS',
}

// export type AbstractSearchConstructor<Input extends object> = new (
//   args: Input
// ) => AbstractSearch<Input>;

export type AbstractSearchConstructor<Search extends AbstractSearch<any, any>> =
  new (input: Search['input']) => Search;

export interface ISearch<Input, Output> {
  id: string;

  type: SearchType;

  url: string;

  input: Input;

  output?: Output;
}

export abstract class AbstractSearch<Input, Output>
  implements ISearch<Input, Output>
{
  id: string = createId();

  abstract type: SearchType;

  url: string;

  input: Input;

  output?: Output;

  constructor(input: Input) {
    this.input = input;
    this.url = this.getUrl();
  }

  // buildMe;

  abstract getUrl(): string;

  buildUrl(): this {
    this.url = this.getUrl();
    return this;
  }

  toSearch(): ISearch<Input, Output> {
    return {
      id: this.id,
      type: this.type,
      url: this.url,
      input: this.input,
      output: this.output,
    };
  }

  as<T extends AbstractSearch<Input, Output>>(
    opt?: AbstractSearchConstructor<T>,
  ): T {
    return this as unknown as T;
  }

  getName(opt?: { unique?: boolean }) {
    return `${this.type}_${opt?.unique ? `_${this.id}` : ''}`;
  }

  getHtmlPath(opt?: { unique?: boolean }) {
    return `${this.getName(opt)}.html`;
  }

  getScreenshotPath(opt?: { unique?: boolean }) {
    return `${this.getName(opt)}.png`;
  }

  writeFile = fs.writeFileSync;

  protected abstract resolvePuppeteerSearch(puppeteer: Page): Promise<Output>;

  async resolveSearch(handle: { puppeteer?: Page }): Promise<this> {
    if (handle.puppeteer) {
      this.output = await this.resolvePuppeteerSearch(handle.puppeteer);
      return this;
    }
    throw new Error('Puppeteer is required for resolveSearch');
  }
}
