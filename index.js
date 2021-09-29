let me = new Vue({
    el:'#globe',
    data:{
        timer: 0,
        datetime: new Date(),
        wwd: null,
        layerDebris: null,
        orbitsLayer: null,
        satData: [],
        satNum: 0,
        everyCurrentPosition: [],
        startOrbit: null
    },
    watch: {
        timer: function (val) {
            var now = new Date();
            this.datetime = new Date(now.getTime() + this.timer * 1000 * 60);
            this.reComputeLocation();
        },
        satNum: function (val) {
            console.log(val);
        }
    },
    methods: {
        construct: function() {
            this.wwd = new WorldWind.WorldWindow("canvasOne");
            this.wwd.addLayer(new WorldWind.BMNGOneImageLayer());
            this.wwd.addLayer(new WorldWind.BMNGLandsatLayer());
            this.wwd.addLayer(new WorldWind.CoordinatesDisplayLayer(this.wwd));
            this.wwd.addLayer(new WorldWind.ViewControlsLayer(this.wwd));
    
            //var geoDebrisLayer = new WorldWind.RenderableLayer("Debris");
            this.layerDebris = new WorldWind.RenderableLayer("Debris");
            this.orbitsLayer = new WorldWind.RenderableLayer("Orbit");
            this.wwd.addLayer(this.layerDebris);
            this.wwd.addLayer(this.orbitsLayer);
            var satParserWorker = new Worker("satelliteParseWorker.js");
            satParserWorker.postMessage("work, satellite parser, work!");
            satParserWorker.addEventListener('message', (event) => {
                satParserWorker.postMessage('close');
                this.getSatellites(event.data);
            }, false);
        },
        getSatellites: function(satellites) {
            this.satData = satellites;
            // this.satData.satDataString = JSON.stringify(satPac);
            this.renderSats();
        },
        renderSats: function () {
            var satNames = [];
            var satOwner = [];
            var satSite = [];
            var satStatus = [];
            var satVelocity = [];
            var satDate =[];
            var now = new Date();
            this.satNum = this.satData.length;
            for (var j = 0; j < this.satNum; j++) {
                var currentPosition = null;
                var time = new Date(now.getTime());

                try {
                    // var velocity = this.getVelocity(satellite.twoline2satrec(this.satData[j].TLE_LINE1, this.satData[j].TLE_LINE2), time);
                    var position = this.getPosition(satellite.twoline2satrec(this.satData[j].TLE_LINE1, this.satData[j].TLE_LINE2), time);
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
            
                placemarkAttributes.imageSource = "assets/icons/red_dot.png";
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
            }, 2000);

            // Listen for mouse clicks.
            var clickRecognizer = new WorldWind.ClickRecognizer(this.wwd, this.handleClick);

            // Listen for taps on mobile devices.
            var tapRecognizer = new WorldWind.TapRecognizer(this.wwd, this.handleClick);
        },
        reComputeLocation: function () {
            for (var indx = 0; indx < this.satNum; indx += 1) {
                var time = new Date(new Date().getTime()+ this.timer * 60000);
                try {
                    var position = this.getPosition(satellite.twoline2satrec(this.satData[indx].TLE_LINE1, this.satData[indx].TLE_LINE2), time);
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
        sanitizeSatellites: function (objectArray) {
            var faultySatellites = 0;
            var resultArray = [];
            var maxSats = objectArray.length;
            var now = new Date();
            var time = new Date(now.getTime());
            for (var i = 0; i < maxSats; i += 1) {
                try {
                    var position = this.getPosition(satellite.twoline2satrec(objectArray[i].TLE_LINE1, objectArray[i].TLE_LINE2), time);
                    // var velocity = this.getVelocity(satellite.twoline2satrec(objectArray[i].TLE_LINE1, objectArray[i].TLE_LINE2), time);
                } catch (err) {
                    // console.log(objectArray[i].OBJECT_NAME +" is a faulty sat it is " + i);
                    faultySatellites += 1;
                    console.log(err);
                    continue;
                }

                resultArray.push(objectArray[i]);
            }
            console.log(faultySatellites);
            console.log(objectArray.length + " from uncleansed");
            console.log(resultArray.length + " from cleansed");
            return resultArray;
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
        handleClick: function (recognizer) {
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
                pastOrbitPathAttributes.outlineColor = WorldWind.Color.RED;
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
        }
    },
    mounted () {
        this.$nextTick(() => this.construct())
    },
})