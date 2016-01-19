# Schema.org-Geocoder Service

Fusepool P3 service that adds geolocations (lat/long) to RDF containing schema.org addresses.

It expects triples in the following form:

```turtle
<http://linked.dati.trentino.it/683>
    <http://schema.org/address> [
        <http://schema.org/addressLocality> "Castello-Molina di Fiemme" ;
        <http://schema.org/postalCode> "38030" ;
        <http://schema.org/streetAddress> "Via Italia 10" ;
        a <http://schema.org/PostalAddress>
    ] ;
    <http://schema.org/name> "Bar Sport" .
```

and it will attach the following triples to it:

```turtle
<http://linked.dati.trentino.it/683>
    <http://schema.org/geo> [
        a <https://schema.org/GeoCoordinates> ;
        <https://schema.org/latitude> "46.2730993"^^xsd:float ;
        <https://schema.org/longitude> "11.4165712"^^xsd:float
    ] ;
```

Note that it attaches the `schema:GeoCoordinates` to the subject, not the `schema:PostalAddress`.

Currently only `schema.org` is supported. But it should not be a big deal to enhance it for other schemas like `vcard`. If you need that create an issue or even better a pull-request.

This service is using [node-geocoder](https://github.com/nchaulet/node-geocoder) for lookup. See the next section on how to adjust it to your needs.

## Installing and Running

You will need [Node.js](http://nodejs.org/) to run the service on your own. Clone the repository and execute

    npm install

to install the required node modules.

Start the transformer with the command

    npm start

By default the service is using OpenStreetmap for resolving addresses. If you want to change that you need to get an API key from alternative services and they need to be set using environment variables. A sample `run.sh` file might look like this:

```shell
#!/bin/sh

export GEOCODER_APIKEY='dflaskdfjsldkfjsdlkfwelfkj'
export GEOCODER_HTTPADAPTER='https'
export GEOCODER_PROVIDER='google'
node index.js
```

See [node-geocoder](https://github.com/nchaulet/node-geocoder) for more information about which services are currently supported. If you need some special options you might have to adjust the code. If you do so please create a pull-request for it so we can integrate it into this repository.

To reduce API calls our code is using the `batchGeocode` method and assumes that the array returns in the same order. We could not find any hints if this is always true but it was in the manual tests we did. In case you experience wrong results, please let us know.

## Usage

A file with some local business information is provided in `test/shops.ttl`. In order to test the transformer the client data will be used locally and the additional data will be fetched from geo service.

First, get an API key for one of the services. Once you did that create your appropriate `run.sh` equivalent and from the root folder run the following command:

    curl -X POST -H "Content-type: text/turtle" -H "Accept: text/turtle" --data-binary "@test/shops.ttl" http://localhost:8080/geocoder  
 
The command starts a synchronous task and the server sends a response with the enhanced triples to the client.