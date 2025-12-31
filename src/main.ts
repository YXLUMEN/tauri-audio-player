import {initialize} from "./lib";

function main() {
    initialize()
        .catch(error => console.error(error))
}

main();