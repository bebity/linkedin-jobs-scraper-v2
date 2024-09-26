import { DetailsSearch } from './details.search.js';
import { ListSearch } from './list.search.js';
import { AbstractSearch, ISearch, SearchType } from './search.abstract.js';

export class SearchFactory {
  static new<T extends AbstractSearch<any, any>>(search: {
    new (args: T['input']): T;
  }) {
    return (args: T['input']) => new search(args);
  }

  static fromSearch<T extends AbstractSearch<any, any>>(
    search: ISearch<any, any>,
  ): T {
    if (!search) {
      throw new Error('Search is required for SearchFactory.fromSearch');
    }
    switch (search.type) {
      case SearchType.LIST_SEARCH:
        return new ListSearch(search.input).as<ListSearch>().setBlankPageCount(search.blankPageCount).setAgregatedCount(search.aggregatedCount || 0) as any;
      case SearchType.JOB_DETAILS:
        return new DetailsSearch(search.input).as<T>().setBlankPageCount(search.blankPageCount);
    }
  }

  static list = this.new(ListSearch).bind(this);

  static details = this.new(DetailsSearch).bind(this);
}
