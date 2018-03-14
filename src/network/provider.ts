import { Coordinator } from '../interface';
import { Query } from '../query/query';
import { QueryCache } from '../query/cache';

export interface NetworkProvider {
    init(coordinator: Coordinator);
    watch(start: Object, query: Query, token: number);
    stopWatch(start: Object, query: Query);
    query(start: Object, query: Query, token: number);
    fact(fact: Object);
}

export interface Spoke {
    gatherQueries(queries : QueryCache);
    distribute(queries: QueryCache, fact: Object);
}
