import {initialize} from "./lib";

function main() {
    initialize()
        .catch(error => console.error(error))
}

//        .then(() => sleep(2000))
//         .then(() => appWindow.close());

main();