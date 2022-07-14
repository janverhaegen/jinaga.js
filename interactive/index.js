const { JinagaServer } = require("../dist/index"); 
const { parseSpecification } = require("../dist/specification/specification-parser");
const { sqlFromSpecification } = require("../dist/postgres/specification-sql");
const { dehydrateReference } = require("../dist/fact/hydrate");
const { getAllFactTypes, getAllRoles } = require("../dist/specification/specification");
const { emptyFactTypeMap, emptyRoleMap, addFactType, addRole, getFactTypeId } = require("../dist/postgres/maps");
const { PostgresStore } = require("../dist/postgres/postgres-store")
const fs = require("fs");


class Supplier {
    constructor(publicKey) {
        this.type = Supplier.Type;
        this.publicKey = publicKey;
    }
}
Supplier.Type = "DWS.SUPPLIER";


class User {
    constructor(publicKey) {
        this.type = User.Type;
        this.publicKey = publicKey;
    }
}
User.Type = "DWS.USER";


class UserName {
    constructor(User, FirstName, LastName, Prior) {
        this.type = UserName.Type;
        this.user = User;
        this.firstName = FirstName;
        this.lastName = LastName;
        this.prior = Prior;
    }
}
UserName.Type = "DWS.USER.NAME";


class Worker {
    constructor(Supplier, User) {
        this.type = Worker.Type;
        this.supplier = Supplier;
        this.user = User;
    }
}
Worker.Type = "DWS.WORKER";


// var user = { "publicKey": "-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAIBsKomutukULWw2zoTW2ECMrM8VmD2xvfpl3R4qh1whzuXV+A4EfRKMb/UAjEfw\n5nBmWvcObGyYUgygKrlNeOhf3MnDj706rej6ln9cKGL++ZNsJgJsogaAtmkPihWVGi908fdP\nLQrWTF5be0b/ZP258Zs3CTpcRTpTvhzS5TC1AgMBAAE=\n-----END RSA PUBLIC KEY-----\n", "type": "Jinaga.User" };
// var company = { "name": "Improving", "type": "ImprovingU.Company", "from": user };
// var semester = { "type": "ImprovingU.Semester", "name": "Fall 2021", "company": company };



async function run() {
    try {

        var connectionString = "postgresql://appuser:apppw@localhost:5432/appdb";       

        const { j, close } = JinagaServer.create({
            pgKeystore: connectionString,
            pgStore:    connectionString
        });


        const user_jan = await j.fact(new User("publicKeyOfJan"));
        const userName_jan_1 = await j.fact(new UserName(user_jan, "Jannnn", "Verhaegen", []));
       const userName_jan_2 = await j.fact(new UserName(user_jan, "Jan", "Verhaegen", [userName_jan_1]));
        const supplier_1 = await j.fact(new Supplier("publicKeyOfSupplier1"));
        const worker_1 = await j.fact(new Worker(supplier_1, user_jan));
        await j.close;


        var postgresStore = new PostgresStore(connectionString);

        try {
            var input = fs.readFileSync(0, 'utf-8');
            var specification = parseSpecification(input);

            // Select starting facts that match the inputs
            var facts = specification.given.map(input => {
                if (input.type === "DWS.SUPPLIER") {
                    return supplier_1;
                }
                if (input.type === "DWS.USER") {
                    return user_jan;
                }
                if (input.type === "DWS.USER.NAME") {
                    return userName_jan_1;
                }
                if (input.type === "DWS.WORKER") {
                    return worker_1;
                }
                throw new Error("Unknown input type: " + input.type);
            });

            const start = facts.map(fact => dehydrateReference(fact));

            const args = process.argv.slice(2);
            const produceResults = args.includes("--results");
            if (produceResults) {
                const results = await postgresStore.resultsFromSpecification(start, specification);
                console.log(JSON.stringify(results, null, 2));
            }
            else {
                const streams = await postgresStore.streamsFromSpecification(start, [], 3, specification);
                console.log(JSON.stringify(streams, null, 2));
            }
        }
        finally {
            postgresStore.close();
        }
    } catch (e) {
        console.error(e);
    }
}

run();