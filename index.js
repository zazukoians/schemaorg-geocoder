
'use strict'

// Check env-vars for customization

var httpAdapter = process.env.GEOCODER_HTTPADAPTER || 'http';
var apiKey = process.env.GEOCODER_APIKEY || '';
var geocoderProvider = process.env.GEOCODER_PROVIDER || 'freegeoip';

// optional
var extra = {
    apiKey: apiKey, // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
};

// requires

var restify = require('restify');
var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter, extra);
var rdf = require('rdf-ext');
var formats = require('rdf-formats-common')();
var clownface = require('clownface');
var rdfBodyParser = require('rdf-body-parser');
var rdfFormats = require('rdf-formats-common')();
var absoluteUrl = require('ldapp-absolute-url');






//  curl -X POST -H "Content-type: text/turtle" --data-binary "@localbusiness.ttl"


function geocoderAccept(req, res, next) {

/*    try {
        console.log("URI: "+req.absoluteUrl());

    } catch (e ){
        console.log(e.stack || e.message);
    }*/

    // TODO this is not the correct URI yet, we need to fix ldapp-absolute-url to work outside express
    var subject = 'http://example.org/subject';

    var metagraph = rdf.createGraph([rdf.createTriple(
        rdf.createNamedNode(subject),
        rdf.createNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        rdf.createNamedNode('http://vocab.fusepool.info/transformer#Transformer'))]);

    metagraph.add(rdf.createTriple(
        rdf.createNamedNode(subject),
        rdf.createNamedNode('http://purl.org/dc/terms/title'),
        rdf.createLiteral('Fusepool P3 schema.org geocoder', 'en')));

    metagraph.add(rdf.createTriple(
        rdf.createNamedNode(subject),
        rdf.createNamedNode('http://purl.org/dc/terms/description'),
        rdf.createLiteral('Adds geolocations (lat/long) to RDF containing schema.org addresses', 'en')));

    var parsers = rdfFormats.parsers.list();
    var serializers = rdfFormats.serializers.list();


    Object.keys(parsers).forEach(function (key) {
        metagraph.add(rdf.createTriple(
            rdf.createNamedNode(subject),
            rdf.createNamedNode('http://vocab.fusepool.info/transformer#supportedInputFormat'),
            rdf.createLiteral(parsers[key])));
    });

    Object.keys(serializers).forEach(function (key) {
        metagraph.add(rdf.createTriple(
            rdf.createNamedNode(subject),
            rdf.createNamedNode('http://vocab.fusepool.info/transformer#supportedOutputFormat'),
            rdf.createLiteral(serializers[key])));
    });


    res.sendGraph(metagraph);
    return next();

}

function geocoderLookup(req, res, next) {

    if (req.graph) {

        var responsegraph = req.graph.clone();

        // get all addresses
        var nodes = req.graph.match(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://schema.org/PostalAddress').map(function (t) { return t.subject });

        // postalADdress als node, danach in mit #type und dann kriege ich die subjects

        var addresses = [];

        var cf = clownface.Graph(req.graph) ;

        nodes.forEach(function(address){
            var saddress = cf.node(address).out('http://schema.org/streetAddress') + ', '
                + cf.node(address).out('http://schema.org/postalCode') +', '
                + cf.node(address).out('http://schema.org/addressLocality');
            console.log(saddress);
            addresses.push(saddress);

        });

        geocoder.batchGeocode(addresses)
            .then(function(res) {

                var i = 0;
                res.forEach(function(geoaddress){

                    //console.log(geoaddress.value[0].latitude+", "+geoaddress.value[0].longitude+", "+geoaddress.value[0].city+"\n");
                    //    console.log(JSON.stringify(address));
                    //    console.log(address.value[0].latitude);

                    //console.log("in: "+cf.node(nodes[i]).in('http://schema.org/address').literal().shift());


                    var subject = rdf.createNamedNode(cf.node(nodes[i]).in('http://schema.org/address').literal().shift());
                    var predicate = rdf.createNamedNode("http://schema.org/geo");
                    var bnode = rdf.createBlankNode();

                    var tgeo = rdf.createTriple(subject, predicate, bnode);

                    var pgeolat = rdf.createNamedNode('https://schema.org/latitude');
                    var pgeolong = rdf.createNamedNode('https://schema.org/longitude');

                    var ogeolat = rdf.createLiteral(geoaddress.value[0].latitude, null, 'http://www.w3.org/2001/XMLSchema#float');
                    var ogeolong = rdf.createLiteral(geoaddress.value[0].longitude, null, 'http://www.w3.org/2001/XMLSchema#float');


                    var tlat = rdf.createTriple(bnode, pgeolat, ogeolat);
                    var tlong = rdf.createTriple(bnode, pgeolong, ogeolong);

                    var sgeocoordinates = rdf.createNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
                    var ogeocoordinates = rdf.createNamedNode('https://schema.org/GeoCoordinates');

                    var tgeocoordinates = rdf.createTriple(bnode, sgeocoordinates, ogeocoordinates);

                    responsegraph.add(tgeo);
                    responsegraph.add(tgeocoordinates);
                    responsegraph.add(tlat);
                    responsegraph.add(tlong);


                    i++;

                });

            })
            .then(function(){
                res.sendGraph(responsegraph);
            })
            .catch(function(err) {
                console.log(err.stack || err.message);
            });



    }

};



var server = restify.createServer();

server.use(rdfBodyParser(rdfFormats));
server.use(absoluteUrl.init());


server.post('/geocoder', geocoderLookup);
server.get('/geocoder', geocoderAccept);


server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});

