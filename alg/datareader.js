(function() {
    "use strict";

    var alg      = require('./cpp.js'),
        fs       = require('fs'),
        readline = require('readline');

    var showUsage = function(){
        console.log("Usage: node " + process.argv[1] + " mydata.txt --start-vertex 1");
        process.exit(1);
    };
    if (process.argv.length < 5) {
        showUsage();
    }

    if(process.argv[3] !== '--start-vertex' && process.argv[3] !== '-s'){
        showUsage();
    }

    var data = {
        filename: process.argv[2],
        startVertex: process.argv[4]
    };

    var rd = readline.createInterface({
        input    : fs.createReadStream(data.filename),
        output   : process.stdout,
        terminal : false
    });

    var adapter = new alg.Adapter();
    var edgeCounter = 0;

    rd.on('line', function(line) {
        if (line.trim().search('#') < 0 && line.trim() !== '') {
            var arr    = line.split(/\s+/);
            var label  = arr[1],
                source = arr[2],
                target = arr[4],
                weight = parseInt(arr[5], 10) || 1; // if weight is not given, assign 1
            adapter.addEdge(label, source, target, weight);
            console.log("Added edge %s weight %s", label, weight);
            edgeCounter++;
        }
    });

    rd.on('close', function(e) {
        console.log("-- [ DEBUG ] -- Reading from file completed.");
        if (adapter) {
            var now = new Date().getTime();
            var walks = adapter.getRouteStartingAt(data.startVertex);
            var later = new Date().getTime();
            var elapsedTime = ( later - now ) / 1000;
            console.log("No of vertices %s", adapter.nodes.length);
            console.log("No of edges %s", edgeCounter);
            console.log("No of walks %s", walks.length);
            console.log("Elapsed time %s seconds.", elapsedTime);
        }
    });

}());
