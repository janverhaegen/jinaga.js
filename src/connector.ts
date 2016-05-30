import Interface = require("./interface");
import NetworkProvider = Interface.NetworkProvider;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
import QueryInverter = require("./queryInverter");
import Inverse = QueryInverter.Inverse;
import JinagaDistributor = require("./jinaga.distributor.server");
import Collections = require("./collections");
import _isEqual = Collections._isEqual;
import _some = Collections._some;
import Debug = require("debug");

var debug = Debug("jinaga.connector");

class Watch {
    constructor(
        public start: Object,
        public query: string,
        public affected: Query
    ) {}
}

class ConnectorSpoke implements Interface.Spoke {
    constructor(
        private connector: JinagaConnector
    ) { }
    
    distribute(fact: Object) {
        this.connector.distribute(fact);
    }
}

class JinagaConnector implements NetworkProvider {
    private spoke: ConnectorSpoke;
    private coordinator: Coordinator;
    private watches: Array<Watch> = [];
    
    constructor(
        private distributor: JinagaDistributor
    ) { 
        this.spoke = new ConnectorSpoke(this);
        this.distributor.connect(this.spoke);
    }
    
    init(coordinator: Coordinator) {
        this.coordinator = coordinator;
    }
    
    watch(start: Object, query: Query) {
        this.distributor.storage.executeQuery(start, query, null, (error: string, results: Array<Object>) => {
            results.forEach((result: Object) => {
                debug("Sending " + JSON.stringify(result));
                this.coordinator.onReceived(result, null, this);
            });
        });
        var inverses = QueryInverter.invertQuery(query);
        inverses.forEach((inverse: Inverse) => {
            this.watches.push(new Watch(start, query.toDescriptiveString(), inverse.affected));
        });
    }
    
    stopWatch(start: Object, query: Query) {
        var str = query.toDescriptiveString();
        for(var index = this.watches.length-1; index >= 0; index--) {
            if (_isEqual(this.watches[index].start, start) &&
                this.watches[index].query === str
            ) {
                this.watches.splice(index, 1);
            }
        }
    }
    
    query(start: Object, query: Query, token: number) {
        this.distributor.storage.executeQuery(start, query, null, (error: string, results: Array<Object>) => {
            results.forEach((result: Object) => {
                debug("Sending " + JSON.stringify(result));
                this.coordinator.onReceived(result, null, this);
            });
            this.coordinator.onDone(token);
        });
    }
    
    fact(fact: Object) {
        debug("Received " + JSON.stringify(fact));
        this.distributor.onReceived(fact, null, this);
    }
    
    distribute(fact: Object) {
        this.watches.forEach((watch) => {
            this.distributor.storage.executeQuery(fact, watch.affected, null, (error: string, affected: Array<Object>) => {
                if (error) {
                    debug(error);
                    return;
                }
                var some: any = _some;
                if (some(affected, (obj: Object) => _isEqual(obj, watch.start))) {
                    debug("Sending " + JSON.stringify(fact));
                    this.coordinator.onReceived(fact, null, this);
                }
            });
        });
    }
}

export = JinagaConnector;