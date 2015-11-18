(function() {
    "use strict";

    /*
     * Disclaimer: The code is based on a paper by Harold Thimbelby 2003.
     *
     * Solves the directed chinese postman problem.
     * Uses a pseudopolynomial algorithm called cycle-canceling.
     *
     * Sometime in the future, I will replace cycle canceling with hungarian algorithm
     * to make it useful.
     */

    //  N,              number of vertices
    //  delta,          deltas of vertices
    //  neg, pos,       unbalanced vertices
    //  arcs,           adjacency matrix, counts arcs between vertices
    //  label,          vectors of labels of arcs (for each vertex pair)
    //  f,              repeated arcs in CPT
    //  c,              costs of cheapest arcs or paths
    //  cheapestLabel   labels of cheapest arcs
    //  defined,        whether path cost is defined between vertices
    //  path,           spanning tree of the graph
    //  basicCost;      total cost of traversing each arc once

    var NONE = -1;

    function new2DArray(dim1, dim2, init /* initial value */) {
        var a = new Array(dim1);
        for (var i = 0; i < a.length; i++) {
            a[i] = new Array(dim2);
        }

        if(init !== undefined){
            for(var m = 0; m < dim1; m++){
                for(var n = 0; n < dim2; n++){
                    a[m][n] = init;
                }
            }
        }

        return a;
    }

    /*constructor*/
    function CPP(vertices) {
        if (vertices <= 0) throw new Error("Graph is empty");
        this.N             = vertices;
        this.delta         = new Array(vertices);
        this.defined       = new2DArray(vertices, vertices, false);
        this.label         = new2DArray(vertices, vertices);
        this.c             = new2DArray(vertices, vertices, 0);
        this.f             = new2DArray(vertices, vertices, 0);
        this.arcs          = new2DArray(vertices, vertices, 0);
        this.cheapestLabel = new2DArray(vertices, vertices, "");
        this.path          = new2DArray(vertices, vertices, 0);

        for (var i = 0; i < vertices; i++) {
            for (var j = 0; j < vertices; j++) {
                this.label[i][j] = [];
            }
        }

        // initializing delta
        for(var k = 0; k < vertices; k++){
            this.delta[k] = 0;
        }

        this.basicCost = 0;
    }

    CPP.prototype.solve = function() {
        var self = this;
        self.floydWarshall();
        self.checkValid();
        self.findUnbalanced();
        self.findFeasible();
        while (self.improvements());
    };

    CPP.prototype.addArc = function(lab, u, v, cost) {
        var self = this;
        if (!self.defined[u][v]) self.label[u][v] = [];
        self.label[u][v].push(lab);
        self.basicCost += cost;
        if (!self.defined[u][v] || self.c[u][v] > cost) {
            self.c[u][v] = cost;
            self.cheapestLabel[u][v] = lab;
            self.defined[u][v] = true;
            self.path[u][v] = v;
        }
        self.arcs[u][v]++;
        self.delta[u]++;
        self.delta[v]--;
        return self;
    };

    CPP.prototype.floydWarshall = function() {
        var self = this;
        for (var k = 0; k < self.N; k++)
            for (var i = 0; i < self.N; i++)
                if (self.defined[i][k])
                    for (var j = 0; j < self.N; j++)
                        if (self.defined[k][j] &&
                            (!self.defined[i][j] || self.c[i][j] > self.c[i][k] + self.c[k][j]) ) {
                            self.path[i][j] = self.path[i][k];
                            self.c[i][j] = self.c[i][k] + self.c[k][j];
                            self.defined[i][j] = true;
                            if (i == j && self.c[i][j] < 0) return; // exit on negative cycle
                        }

     // for(var m = 0; m < self.N; m++){
     //     if (self.c[m][m] < 0) return; // stop on negative cycle
     // }

    };

    CPP.prototype.checkValid = function() {
        var self = this;
        for (var i = 0; i < self.N; i++) {
            for (var j = 0; j < self.N; j++) {
                if (!self.defined[i][j]) throw new Error("Graph is not strongly connected");
                if (self.c[i][i] < 0) throw new Error("Graph has negative cycle");
            }
        }
    };


    CPP.prototype.cost = function() {
        var self = this;
        return self.basicCost + self.phi();
    };

    CPP.prototype.phi = function() {
        var self = this;
        var p = 0; // phi
        for (var i = 0; i < self.N; i++){
            for (var j = 0; j < self.N; j++)
                p += ( self.c[i][j] * self.f[i][j] );
        }
        console.log("Phi is " + p);
        return p;
    };

    CPP.prototype.findUnbalanced = function() {
        var self = this;
        var nn = 0,
            np = 0; // number of vertices of negative/positive delta

        for (var i = 0; i < self.N; i++)
            if (self.delta[i] < 0) nn++;
            else if (self.delta[i] > 0) np++;

        self.neg = new Array(nn);
        self.pos = new Array(np);

        nn = np = 0;
        for (var j = 0; j < self.N; j++) // initialise sets
            if (self.delta[j] < 0) self.neg[nn++] = j;
            else if (self.delta[j] > 0) self.pos[np++] = j;
    };

    CPP.prototype.findFeasible = function() {
        var self = this;
        // var delta = new Array( self.N );
        // for( var k = 0; k < self.N; k++ )
        //     delta[k] = self.delta[k];

        var delta = self.delta.slice(); // fast array copy than above

        for (var u = 0; u < self.neg.length; u++) {
            var i = self.neg[u];
            for (var v = 0; v < self.pos.length; v++) {
                var j = self.pos[v];
                self.f[i][j] = -delta[i] < delta[j] ? -delta[i] : delta[j];
                delta[i] += self.f[i][j];
                delta[j] -= self.f[i][j];
            }
        }
    };

    CPP.prototype.improvements = function() {
        var self = this;
        var residual = new CPP(self.N);
        for (var u = 0; u < self.neg.length; u++) {
            var i = self.neg[u];
            for (var v = 0; v < self.pos.length; v++) {
                var j = self.pos[v];
                residual.addArc(null, i, j, self.c[i][j]);
                if (self.f[i][j] !== 0) residual.addArc(null, j, i, -self.c[i][j]);
            }
        }
        residual.floydWarshall();

        for (var x = 0; x < self.N; x++)
            if (residual.c[x][x] < 0) { // cancel the cycle (if any)
                var k = 0,
                    m, n;
                var kunset = true;
                m = x;
                do { // find k to cancel
                    n = residual.path[m][x];
                    if (residual.c[m][n] < 0 && (kunset || k > self.f[n][m])) {
                        k = self.f[n][m];
                        kunset = false;
                    }
                } while ((m = n) !== x);
                m = x;
                do { // cancel k along the cycle
                    n = residual.path[m][x];
                    if (residual.c[m][n] < 0) self.f[n][m] -= k;
                    else self.f[m][n] += k;
                } while ((m = n) !== x);
                return true; // check again for -ve cycle
            }
        return false; // no improvements found

    };

    CPP.prototype.findPath = function(from, f) { // find path between unbalanced vertices
        var self = this;
        for (var i = 0; i < self.N; i++) {
            if (f[from][i] > 0) return i;
        }
        return NONE;
    };

    CPP.prototype.traceRoute = function(startVertex) {
        var self = this;
        var result = [];
        var v = startVertex;
        var arcs = new2DArray(self.N, self.N);
        var f = new2DArray(self.N, self.N);
        for (var i = 0; i < self.N; i++) {
            for (var j = 0; j < self.N; j++) {
                arcs[i][j] = self.arcs[i][j];
                f[i][j] = self.f[i][j];
            }
        }

        while (true) {
            var u = v;
            if ((v = self.findPath(u, f)) != NONE) {
                f[u][v]--; // remove path
                for (var p; u != v; u = p) { // breakdown path into its arcs
                    p = self.path[u][v];
                    result.push({label: self.cheapestLabel[u][p], source: u, target: p});
                }
            } else {
                var bridgeVertex = self.path[u][startVertex];
                if (arcs[u][bridgeVertex] === 0) break;
                v = bridgeVertex;
                for (var k = 0; k < self.N; k++) {
                    if (k != bridgeVertex && arcs[u][k] > 0) {
                        v = k;
                        break;
                    }
                }
                arcs[u][v]--;

                var labelIdx = arcs[u][v];
                result.push({label: self.label[u][v][labelIdx], source: u, target: v});
            }
        }
        return result;
    };

    CPP.prototype.debugCostandF =function(first_argument) {
        var self = this;
        console.log(" --- c and f debug message --- ");
        for( var i = 0; i < self.N; i++ ){
            console.log( "f["+i+"]= ", self.f[i].join(", "));
        }

        for( var j = 0; j < self.N; j++ ){
            console.log( "arcs["+j+"]= ", self.arcs[j].join(', '));
        }
        console.log();
    };


    //----------------ADAPTER-----------------
    //
    // The Adapter allows the use of any kind of vertex name
    // For example:
    // adapter.addEdge("ab", "a", "b", 3) is now possible
    //

    /* Pimping the array constructor */
    Array.prototype.uniqueInsert = function(elem){
        var self = this;
        if( self.indexOf(elem) === -1 ) self.push(elem);
        return self;
    };

    function Adapter(cpp){
        this.cpp = cpp;
        this.nodes = [];
        this.edges = [];
    }

    Adapter.prototype.addEdge = function(label, source, target, weight) {
        var self = this;
        self.nodes.uniqueInsert(source).uniqueInsert(target);
        var sourceIdx = self.nodes.indexOf(source);
        var targetIdx = self.nodes.indexOf(target);
        self.edges.push({label: label, source: sourceIdx, target: targetIdx, weight: weight});
        return self;
    };

    Adapter.prototype.__toCPPForm = function(){
        var self = this;
        self.cpp = new CPP(self.nodes.length);
        self.edges.forEach(function(edge){
            self.cpp.addArc(edge.label, edge.source, edge.target, edge.weight);
        });
    };

    Adapter.prototype.getRouteStartingAt = function(startVertex){
        var self = this;
        self.__toCPPForm();
        console.log("-- [ DEBUG %s ] -- Solving CPP started", new Date());
        self.cpp.solve();
        console.log("-- [ DEBUG %s ] -- Solving CPP completed.", new Date());

        var startIdx = self.nodes.indexOf(startVertex);

        if(startIdx === -1){
            console.log("Error: Start vertex \"%s\" not found. Exiting!", startVertex);
            console.log("Type of startVertex ", typeof(startVertex));
            return;
        }

        var resultRoute = self.cpp.traceRoute(startIdx);
        console.log("Start at vertex '%s'", startVertex);
        resultRoute.forEach(function(arc){
            console.log( "next walk " + arc.label + " from " +  self.nodes[arc.source] + " to "+ self.nodes[arc.target] );
        });
        console.log("Cost = "+self.cpp.cost());
        return resultRoute;

    };

    // Testing

/// var adapter = new Adapter();
///   adapter
///    .addEdge("a", 2, 1, 3)
///    .addEdge("b", 2, 3, 2)
///    .addEdge("c", 3, 6, 2)
///    .addEdge("d", 5, 2, 1)
///    .addEdge("e", 4, 1, 7)
///    .addEdge("f", 1, 4, 7)
///    .addEdge("g", 4, 5, 2)
///    .addEdge("h", 6, 5, 3)
///    .addEdge("i", 9, 6, 6)
///    .addEdge("j", 5, 8, 4)
///    .addEdge("k", 7, 4, 6)
///    .addEdge("l", 8, 7, 1)
///    .addEdge("m", 8, 9, 2);

/// adapter.getRouteStartingAt(1);


////    var g = new CPP(5);
////    g.
////        addArc("ba", 0, 1, 1)
////       .addArc("ac", 1, 2, 1)
////       .addArc("ad", 1, 3, 1)
////       .addArc("ae", 1, 4, 1)
////       .addArc("de", 3, 4, 1)
////       .addArc("eb", 4, 0, 1)
////       .addArc("bc", 0, 2, 1)
////       .addArc("cd", 2, 3, 1);

////    g.solve();
////    g.traceRoute(1);
////    console.log("Cost = "+g.cost());



    module.exports = {
        Adapter: Adapter
    };

}());
