import { Controller, Get, Header, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  search(@Query('q') query?: string, @Query('limit') limit?: string) {
    return this.searchService.search(query, limit);
  }
}
