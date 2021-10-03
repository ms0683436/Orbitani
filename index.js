let me = new Vue({
    el:'#globe',
    data: {
        timer: 0,
        datetime: new Date(),
        wwd: null,
        layerDebris: null,
        orbitsLayer: null,
        roundLayer: null,
        geocoder: null,
        goToAnimator: null,
        TLE: null,
        satData: [],
        satNum: 0,
        everyCurrentPosition: [],
        startOrbit: null,
        queryString: null,
        destination: null,
        radius: 6371,
        loading: false,
        radarRange: 1000, // km
        debrisImgs: ['debris1.png', 'debris2.png', 'debris3.png', 'debris4.png', 'debris5.png', 'debris6.png'],
        pickCategory: 'low',
        debrisCategory: {
            'all': {
                'altitudeMin': 0,
                'altitudeMax': 100000,
                'file': '_now-30.json'
            },
            'low': {
                'altitudeMin': 0,
                'altitudeMax': 2000,
                'file': 'LEO_now-30.json'
            },
            'medium': {
                'altitudeMin': 2001,
                'altitudeMax': 35786,
                'file': 'MEO_now-30.json'
            },
            'high': {
                'altitudeMin': 35786,
                'altitudeMax': 100000,
                'file': 'HEO_now-30.json'
            }
        },
        altitudeFilter: 1000
    },
    watch: {
        timer: function (val) {
            this.reComputeLocation();
        },
        satNum: function (val) {
            console.log(val);
        },
        pickCategory: function (val) {
            this.loadData()
        }
    },
    methods: {
        construct: function() {
            this.wwd = new WorldWind.WorldWindow("canvasOne");
            this.wwd.addLayer(new WorldWind.BMNGOneImageLayer());
            this.wwd.addLayer(new WorldWind.CoordinatesDisplayLayer(this.wwd));
            // this.wwd.addLayer(new WorldWind.ViewControlsLayer(this.wwd));
    
            this.layerDebris = new WorldWind.RenderableLayer("Debris");
            this.orbitsLayer = new WorldWind.RenderableLayer("Orbit");
            this.roundLayer = new WorldWind.RenderableLayer();
            this.wwd.addLayer(this.layerDebris);
            this.wwd.addLayer(this.orbitsLayer);
            this.wwd.addLayer(this.roundLayer);

            this.wwd.navigator.lookAtLocation.latitude = 23.9037;
            this.wwd.navigator.lookAtLocation.longitude = 121.0794;
            this.wwd.navigator.range = 20e6; // 20 million meters above the ellipsoid

            this.wwd.redraw();
            this.geocoder = new WorldWind.NominatimGeocoder();
            this.goToAnimator = new WorldWind.GoToAnimator(this.wwd);
            this.loadData()

            setInterval(() => {
                var now = new Date();
                this.datetime = new Date(now.getTime() + this.timer * 1000 * 60);
            });
        },
        loadData: function () {
            let satParserWorker = new Worker("satelliteParseWorker.js");
            satParserWorker.postMessage(this.debrisCategory[this.pickCategory].file);
            satParserWorker.addEventListener('message', (event) => {
                satParserWorker.postMessage('close');
                this.TLE = event.data;
            }, false);
        },
        getSatellites: function (objects) {
            this.satData = objects
            this.renderSats()
        },
        getRandomIntInclusive: function () {
            let min = 0, max = 5
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
        },
        renderSats: function () {
            var satNames = [];
            var satOwner = [];
            var satSite = [];
            var satStatus = [];
            var satVelocity = [];
            var satDate =[];
            this.satNum = this.satData.length;
            for (var j = 0; j < this.satNum; j++) {
                var currentPosition = null;

                try {
                    // var velocity = this.getVelocity(satellite.twoline2satrec(this.satData[j].TLE_LINE1, this.satData[j].TLE_LINE2), time);
                    var position = this.getPosition(satellite.twoline2satrec(this.satData[j].TLE_LINE1, this.satData[j].TLE_LINE2), this.datetime);
                } catch (err) {
                    console.log(err + ' in renderSats, sat ' + j);
                    this.everyCurrentPosition.push(null);
                    continue;
                }
                try {
                    // satVelocity.push(velocity);
                    currentPosition = new WorldWind.Position(position.latitude,
                        position.longitude,
                        position.altitude);
                    this.everyCurrentPosition.push(currentPosition);
                    // satSite.push(this.satData[j].LAUNCH_SITE);
                    // satNames.push(this.satData[j].OBJECT_NAME);
                    // satOwner.push(this.satData[j].OWNER);
                    // satStatus.push(this.satData[j].OPERATIONAL_STATUS);
                    // satDate[j] = this.satData[j].LAUNCH_DATE.substring(0, 4);
                } catch (err) {
                    console.log(err + ' in renderSats, sat ' + j);
                    continue;
                }
                var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
                var highlightPlacemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                highlightPlacemarkAttributes.imageScale = 0.4;

                placemarkAttributes.imageSource = "assets/icons/" + this.debrisImgs[this.getRandomIntInclusive()];
                placemarkAttributes.imageScale = 0.2;
                highlightPlacemarkAttributes.imageScale = 0.3;
            
                placemarkAttributes.imageOffset = new WorldWind.Offset(
                    WorldWind.OFFSET_FRACTION, 0.5,
                    WorldWind.OFFSET_FRACTION, 0.5);
                placemarkAttributes.imageColor = WorldWind.Color.WHITE;
                placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
                    WorldWind.OFFSET_FRACTION, 0.5,
                    WorldWind.OFFSET_FRACTION, 1.0);
                placemarkAttributes.labelAttributes.color = WorldWind.Color.WHITE;
            
            
                var placemark = new WorldWind.Placemark(this.everyCurrentPosition[j]);
                placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                placemark.attributes = placemarkAttributes;
                placemark.highlightAttributes = highlightPlacemarkAttributes;
            
                this.layerDebris.addRenderable(placemark);
                this.wwd.redraw();
            }

            var updatePositions = setInterval(() => {
                this.reComputeLocation();
            });

            // Listen for mouse clicks.
            var clickRecognizer = new WorldWind.ClickRecognizer(this.wwd, this.handleClick);

            // Listen for taps on mobile devices.
            var tapRecognizer = new WorldWind.TapRecognizer(this.wwd, this.handleClick);
        },
        reComputeLocation: function () {
            for (var indx = 0; indx < this.satNum; indx += 1) {
                try {
                    var position = this.getPosition(satellite.twoline2satrec(this.satData[indx].TLE_LINE1, this.satData[indx].TLE_LINE2), this.datetime);
                    //satVelocity[indx] = getVelocity(satellite.twoline2satrec(this.satData[indx].TLE_LINE1, this.satData[indx].TLE_LINE2), time);
                } catch (err) {
                    console.log(err + ' in updatePositions interval, sat ' + indx);
                    continue;
                }
                try {
                    // console.log(this.everyCurrentPosition[indx].latitude);
                    this.everyCurrentPosition[indx].latitude = position.latitude;
                    this.everyCurrentPosition[indx].longitude = position.longitude;
                    this.everyCurrentPosition[indx].altitude = position.altitude;
                    // console.log(this.everyCurrentPosition[indx].latitude);
                } catch (err) {
                    console.log(err);
                }
            }
            this.wwd.redraw();
        },
        getPosition: function (satrec, time) {
            var position_and_velocity = satellite.propagate(satrec,
                time.getUTCFullYear(),
                time.getUTCMonth() + 1,
                time.getUTCDate(),
                time.getUTCHours(),
                time.getUTCMinutes(),
                time.getUTCSeconds());
            var position_eci = position_and_velocity["position"];

            var gmst = satellite.gstime_from_date(time.getUTCFullYear(),
                time.getUTCMonth() + 1,
                time.getUTCDate(),
                time.getUTCHours(),
                time.getUTCMinutes(),
                time.getUTCSeconds());

            var position_gd = satellite.eci_to_geodetic(position_eci, gmst);
            var latitude = satellite.degrees_lat(position_gd["latitude"]);
            var longitude = satellite.degrees_long(position_gd["longitude"]);
            var altitude = position_gd["height"] * 1000;

            return new WorldWind.Position(latitude, longitude, altitude);
        },
        getVelocity: function (satrec, time) {
            var j = this.jday(time.getUTCFullYear(),
            time.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
            time.getUTCDate(),
            time.getUTCHours(),
            time.getUTCMinutes(),
            time.getUTCSeconds());
            j += time.getUTCMilliseconds() * 1.15741e-8;

            var m = (j - satrec.jdsatepoch) * 1440.0;
            var pv = satellite.sgp4(satrec, m);
            var vx, vy, vz;

            vx = pv.velocity.x;
            vy = pv.velocity.y;
            vz = pv.velocity.z;

            var satVelocity = Math.sqrt(
                vx * vx +
                vy * vy +
                vz * vz
            );
            return satVelocity;
        },
        jday: function (year, mon, day, hr, minute, sec) {
            return (367.0 * year -
                Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
                Math.floor(275 * mon / 9.0) +
                day + 1721013.5 +
                ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
            );
        },
        aboveAltitude: function (altitude) {
            return altitude < (this.altitudeFilter * 1000)
        },
        handleClick: function (recognizer) {
            this.endOrbit();
            // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
            // the mouse or tap location.
            var x = recognizer.clientX,
                y = recognizer.clientY;

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var rectRadius = 1,
                pickPoint = this.wwd.canvasCoordinates(x, y),
                pickRectangle = new WorldWind.Rectangle(pickPoint[0] - rectRadius, pickPoint[1] + rectRadius,
                    2 * rectRadius, 2 * rectRadius);
    
            var pickList = this.wwd.pickShapesInRegion(pickRectangle);

            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    if (pickList.objects[p].isOnTop) {
                        // Highlight the items picked.
                        pickList.objects[p].userObject.highlighted = true;
                        // highlightedItems.push(pickList.objects[p].userObject);
    
                        //Populate Info window with proper data
                        var position = pickList.objects[p].position;
                            satIndex = this.everyCurrentPosition.indexOf(position);
                        this.orbitsLayer.enabled = true;
                        if (satIndex > -1) {
                            this.createOrbit(satIndex);
                        }
                        //Redraw highlighted items
                        this.wwd.redraw();
                    }
                }
            }
        },
        createOrbit: function (index) {
            this.endOrbit();
            this.startOrbit = window.setInterval(() => {
                this.orbitsLayer.removeAllRenderables();
                var now = new Date();
                var pastOrbit = [];
                var futureOrbit = [];
                for (var i = -60; i <= 60; i++) {
                    var time = new Date(now.getTime() + (i * 1000 * 60) + (this.timer * 1000 * 60));
                    try {
                        var position = this.getPosition(satellite.twoline2satrec(this.satData[index].TLE_LINE1, this.satData[index].TLE_LINE2), time);
                    } catch (err) {
                        console.log(err + ' in createOrbit, sat ' + index);
                        continue;
                    }

                    if (i <= 0) {
                        pastOrbit.push(position);
                    }
                    if (i >= 0) {
                        futureOrbit.push(position);
                    }
                }

                // Orbit Path
                var pastOrbitPathAttributes = new WorldWind.ShapeAttributes(null);
                pastOrbitPathAttributes.outlineColor = WorldWind.Color.YELLOW;
                pastOrbitPathAttributes.interiorColor = new WorldWind.Color(1, 0, 0, 0.5);

                var futureOrbitPathAttributes = new WorldWind.ShapeAttributes(null);//pastAttributes
                futureOrbitPathAttributes.outlineColor = WorldWind.Color.GREEN;
                futureOrbitPathAttributes.interiorColor = new WorldWind.Color(0, 1, 0, 0.5);

                //plot orbit on click
                var pastOrbitPath = new WorldWind.Path(pastOrbit);
                pastOrbitPath.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                pastOrbitPath.attributes = pastOrbitPathAttributes;
                pastOrbitPath.useSurfaceShapeFor2D = true;

                var futureOrbitPath = new WorldWind.Path(futureOrbit);
                futureOrbitPath.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                futureOrbitPath.attributes = futureOrbitPathAttributes;
                futureOrbitPath.useSurfaceShapeFor2D = true;

                this.orbitsLayer.addRenderable(pastOrbitPath);
                this.orbitsLayer.addRenderable(futureOrbitPath);
            });
        },
        endOrbit: function () {
            clearInterval(this.startOrbit);
            this.orbitsLayer.removeAllRenderables();
        },
        goTo: function () {
            this.loading = true;
            this.endOrbit();
            this.removeDebris();
            if (!this.queryString || this.queryString == '') {
                this.loading = false;
                return
            }
            this.geocoder.lookup(this.queryString, (geocoder, result) => {
                if (result.length > 0) {
                    let latitude = parseFloat(result[0].lat);
                    let longitude = parseFloat(result[0].lon);

                    WorldWind.Logger.log(
                        WorldWind.Logger.LEVEL_INFO, this.queryString + ": " + latitude + ", " + longitude);

                    this.goToAnimator.goTo(new WorldWind.Location(latitude, longitude));
                    this.locationRound(latitude, longitude)
                    latitude = 2 * Math.PI * latitude / 360
                    longitude = 2 * Math.PI * longitude / 360

                    this.destination = {
                        x: this.radius * Math.cos(latitude) * Math.cos(longitude),
                        y: this.radius * Math.cos(latitude) * Math.sin(longitude),
                        z: this.radius * Math.sin(latitude)
                    }

                    if (this.TLE.length > 0) {
                        var now = new Date();
                        var debris = [];
                        for (var index = 0; index < this.TLE.length; index++) {
                            for (var i = 0; i <= 60; i++) {
                                var time = new Date(now.getTime() + (i * 1000 * 60) + (this.timer * 1000 * 60));
                                try {
                                    var position = this.getPosition(satellite.twoline2satrec(this.TLE[index].TLE_LINE1, this.TLE[index].TLE_LINE2), time);
                                    if (!this.aboveAltitude(position.altitude)) {
                                        break;
                                    }
                                } catch (err) {
                                    continue;
                                }
                                if (this.calCosAngle(position.latitude, position.longitude) > Math.cos(this.radarRange / this.radius)) {
                                    debris.push(this.TLE[index]);
                                    break;
                                }
                            }
                        }
                        this.getSatellites(debris)
                    }
                }
                this.loading = false;
            });
        },
        removeDebris: function () {
            this.satData = []
            this.satNum = 0
            this.everyCurrentPosition = []
            this.layerDebris.removeAllRenderables();
        },
        removeAll: function () {
            this.removeDebris();
            this.endRound();
        },
        calCosAngle: function (tLatitude, tLongitude) {
            let x = this.destination.x,
                y = this.destination.y,
                z = this.destination.z

            tLatitude = 2 * Math.PI * tLatitude / 360
            tLongitude = 2 * Math.PI * tLongitude / 360

            let tx = this.radius * Math.cos(tLatitude) * Math.cos(tLongitude),
                ty = this.radius * Math.cos(tLatitude) * Math.sin(tLongitude),
                tz = this.radius * Math.sin(tLatitude)

            return (x * tx + y * ty + z * tz) / (Math.sqrt(x * x + y * y + z * z) * Math.sqrt(tx * tx + ty * ty + tz * tz))
        },
        locationRound: function (latitude, longitude) {
            this.endRound();
            this.roundLayer.removeAllRenderables();
            this.roundLayer.enabled = true;
            var attributes = new WorldWind.ShapeAttributes(null);
            attributes.outlineColor = new WorldWind.Color(28, 255, 47, 1);
            attributes.interiorColor = new WorldWind.Color(28, 255, 47, 0.1);
            var shape = new WorldWind.SurfaceCircle(new WorldWind.Location(
                latitude,
                longitude),
                this.radarRange * 1000,
                attributes);
    
            this.roundLayer.addRenderable(shape);
        },
        endRound: function () {
            this.roundLayer.removeAllRenderables();
        }
    },
    mounted () {
        this.$nextTick(() => this.construct())
    },
})