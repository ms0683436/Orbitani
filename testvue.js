let me = new Vue({
    el:'#globe',
    data:{
        timer : 0,
        wwd : null,
        layerDebris: null,
        satData:[],
        satNum:0,
        everyCurrentPosition:[],
    },
    watch: {
        timer: function (val) {
          console.log(val);
          this.reComputeLocation();
          
        },
        satNum: function (val) {
            console.log(val);
        }
    },
    methods: {
        construct:function(){
            const canvas = this.$el.querySelector('#canvasOne');
            canvas.width = 800;
            canvas.height = 600;
            this.wwd = new WorldWind.WorldWindow("canvasOne");
            this.wwd.addLayer(new WorldWind.BMNGOneImageLayer());
            this.wwd.addLayer(new WorldWind.BMNGLandsatLayer());
            this.wwd.addLayer(new WorldWind.CompassLayer());
            this.wwd.addLayer(new WorldWind.CoordinatesDisplayLayer(this.wwd));
            this.wwd.addLayer(new WorldWind.ViewControlsLayer(this.wwd));
    
            //var geoDebrisLayer = new WorldWind.RenderableLayer("Debris");
            this.layerDebris = new WorldWind.RenderableLayer("Debris");
            this.wwd.addLayer(this.layerDebris);
    
            var satParserWorker = new Worker("Workers/satelliteParseWorker.js");
            satParserWorker.postMessage("work, satellite parser, work!");
            satParserWorker.addEventListener('message', function (event) {
            satParserWorker.postMessage('close');
            me.getSatellites(event.data);
            }, false);
        },
        getSatellites: function(satellites){
            this.satData = this.sanitizeSatellites(satellites);
            //this.satData.satDataString = JSON.stringify(satPac);
            this.renderSats();
        },
        renderSats: function(){
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
                var velocity = this.getVelocity(satellite.twoline2satrec(this.satData[j].TLE_LINE1, this.satData[j].TLE_LINE2), time);
                var position = this.getPosition(satellite.twoline2satrec(this.satData[j].TLE_LINE1, this.satData[j].TLE_LINE2), time);
              } catch (err) {
                console.log(err + ' in renderSats, sat ' + j );
                continue;
              }
              try {
                satVelocity.push(velocity);
                currentPosition = new WorldWind.Position(position.latitude,
                  position.longitude,
                  position.altitude);
              this.everyCurrentPosition.push(currentPosition);
              satSite.push(this.satData[j].LAUNCH_SITE);
              satNames.push(this.satData[j].OBJECT_NAME);
              satOwner.push(this.satData[j].OWNER);
              satStatus.push(this.satData[j].OPERATIONAL_STATUS);
              satDate[j] = this.satData[j].LAUNCH_DATE.substring(0, 4);
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


            var updatePositions = setInterval(function () {
              me.reComputeLocation();
            }, 2000);
        },
        reComputeLocation: function(){
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
                  console.log(this.everyCurrentPosition[indx].latitude);
                  this.everyCurrentPosition[indx].latitude = position.latitude;
                  this.everyCurrentPosition[indx].longitude = position.longitude;
                  this.everyCurrentPosition[indx].altitude = position.altitude;
                  console.log(this.everyCurrentPosition[indx].latitude);
                } catch (err) {
                  console.log(err);
                }
              }
            this.wwd.redraw();
        },
        sanitizeSatellites: function(objectArray){
            var faultySatellites = 0;
            var resultArray = [];
            var maxSats = objectArray.length;
            updateTime = performance.now();
            var now = new Date();
            var time = new Date(now.getTime());
            for (var i = 0; i < maxSats; i += 1) {
              try {
                var position = this.getPosition(satellite.twoline2satrec(objectArray[i].TLE_LINE1, objectArray[i].TLE_LINE2), time);
                var velocity = this.getVelocity(satellite.twoline2satrec(objectArray[i].TLE_LINE1, objectArray[i].TLE_LINE2), time);
          
              } catch (err) {
               // console.log(objectArray[i].OBJECT_NAME +" is a faulty sat it is " + i);
                faultySatellites += 1;
                console.log(err);
                continue;
              }
              
              resultArray.push(objectArray[i]);
            }
            updateTime = performance.now() - updateTime;
            console.log(faultySatellites);
            console.log(objectArray.length + " from uncleansed");
            console.log(resultArray.length + " from cleansed");
            return resultArray;
        },
        getPosition: function(satrec, time){
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
        getVelocity: function(satrec, time){
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
        jday: function(year, mon, day, hr, minute, sec) {
            return (367.0 * year -
              Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
              Math.floor(275 * mon / 9.0) +
              day + 1721013.5 +
              ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
            );
        }
    },
    mounted () {
        this.$nextTick(() => this.construct())
    },
})