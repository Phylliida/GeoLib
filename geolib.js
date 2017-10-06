function Geo(isHighAccuracy, GPSPingRate, getGPSCoords, getCurrentSpeed, onTouchDown, onTouchUp) {
  this.getGPSCoords = getGPSCoords;
  this.getSpeed = getCurrentSpeed;
  this.GPSPingRate = GPSPingRate;
  this.onTouchDown = onTouchDown;
  this.onTouchUp = onTouchUp;
 
  // Max speed (anything higher will be capped to this) is 2 meters per second = 4.47 miles per hour
  // This is a little faster than typical jogging speed. That means that anything going faster than that
  // (in a car, on a bike, etc.) will be just as good as jogging, and that there is a slight benifit over 
  // jogging then walking.
  this.maxSpeed = 2;
 
  this.prevCheckTime = Date.now();
  this.metersTraveled = 0.0;
  this.positionCheckRate = 15;
  this.curPositionCheck = 0;
  this.prevLat = null;
  this.prevLon = null;
 
  this.numGPSPrevUsed = 5;
  this.latBuffer = [];
  this.lonBuffer = [];
  
  var mThis = this;

  this.ParseTouchDown = function(e)
  {
    if (e.changedTouches && e.changedTouches.length > 0)
    {
      var touchX = e.changedTouches[0].pageX;
      var touchY = e.changedTouches[0].pageY;
      if (mThis.onTouchDown)
      {
        mThis.onTouchDown(touchX, touchY);
      }
      
    }
    else if(e.clientX && e.clientY)
    {
      var touchX = e.clientX;
      var touchY = e.clientY;
      if (mThis.onTouchDown)
      {
        mThis.onTouchDown(touchX, touchY);
      }
    }
  };

  this.ParseTouchUp = function(e)
  {
    if (e.changedTouches && e.changedTouches.length > 0)
    {
      var touchX = e.changedTouches[0].pageX;
      var touchY = e.changedTouches[0].pageY;
      if (mThis.onTouchUp)
      {
        mThis.onTouchUp(touchX, touchY);
      }
      
    }
    else if(e.clientX && e.clientY)
    {
      var touchX = e.clientX;
      var touchY = e.clientY;
      if (mThis.onTouchUp)
      {
        mThis.onTouchUp(touchX, touchY);
      }
    }
  };

  this.CallGPSTracker = function(isHighAccuracy)
  {
    var options = {
      maximumAge: mThis.GPSPingRate,
      timeout: mThis.GPSPingRate,
      enableHighAccuracy: isHighAccuracy
    };

    navigator.geolocation.getCurrentPosition(function(position) {
      mThis.ProcessPosition(position.coords.latitude, position.coords.longitude, isHighAccuracy);
    },
    function(e) {
      setTimeout(function() {
        mThis.CallGPSTracker(isHighAccuracy);
      }, mThis.GPSPingRate);
    },
    options
    );
  };

  
  this.MetersToDegrees = function(meters)
  {
     var kmCircumfrence = 40075.017;
     ratioOfCircumfrence = meters*1000/kmCircumfrence;
     return ratioOfCircumfrence/360.0;
  }
  
  this.DegreesToMeters = function(degrees)
  {
    
  }
  
  // In kilometers
  this.PtDistance = function(lat1, lon1, lat2, lon2)
  {
    var toRadians = 2*3.1415926536/360.0;
    var lat1r = lat1*toRadians;
    var lon1r = lon1*toRadians;
    var lat2r = lat2*toRadians;
    var lon2r = lon2*toRadians;
    
    var sin_lat1 = Math.sin(lat1r);
    var cos_lat1 = Math.cos(lat1r);
    
    var sin_lat2 = Math.sin(lat2r);
    var cos_lat2 = Math.cos(lat2r);
    
    var delta_lon = lon2r - lon1r;
    
    var cos_delta_lon = Math.cos(delta_lon);
    var sin_delta_lon = Math.sin(delta_lon);
    
    var val1 = (cos_lat2 * sin_delta_lon);
    var val2 = (cos_lat1 * sin_lat2 -
           sin_lat1 * cos_lat2 * cos_delta_lon);
    var val3 = sin_lat1 * sin_lat2 + cos_lat1 * cos_lat2 * cos_delta_lon;
    
    var EARTH_RADIUS = 6371.009;
    return Math.abs(Math.atan2(Math.sqrt(val1*val1+val2*val2), val3)*EARTH_RADIUS);
    
  }
  
  this.ProcessPosition = function(lat, lon, isHighAccuracy)
  {
    while (mThis.latBuffer.length > mThis.numGPSPrevUsed)
    {
      mThis.latBuffer.splice(0,1);
      mThis.lonBuffer.splice(0,1);
    }

    var avgLat = 0;
    var avgLon = 0;
    for (var i = 0; i < mThis.latBuffer.length; i++)
    {
      avgLat += mThis.latBuffer[i];
      avgLon += mThis.lonBuffer[i];
    }
    
    if (mThis.latBuffer.length > 0)
    {
      avgLat /= mThis.latBuffer.length;
      avgLon /= mThis.lonBuffer.length;
    }
    
    if ((Math.abs(lat - avgLat) > 0.01 && Math.abs(lon-avgLon) > 0.01))
    {
      mThis.latBuffer = [];
      mThis.lonBuffer = [];
      avgLat = lat;
      avgLon = lon;
    }
    avgLat = (avgLat*mThis.latBuffer.length+lat)/(mThis.latBuffer.length+1);
    avgLon = (avgLon*mThis.lonBuffer.length+lon)/(mThis.lonBuffer.length+1);
    
    mThis.latBuffer.push(lat);
    mThis.lonBuffer.push(lon);
    
    setTimeout(function() 
    {
      mThis.CallGPSTracker(isHighAccuracy);
    }, mThis.GPSPingRate);
    
    if (mThis.latBuffer.length > 0)
    {
      if (!(mThis.prevLat && mThis.prevLon))
      {
          mThis.prevLat = avgLat;
          mThis.prevLon = avgLon; 
      }
      
      mThis.curPositionCheck += 1;
      if (mThis.curPositionCheck >= mThis.positionCheckRate)
      {
          var curTime = Date.now();
          var secondsElapsed = (curTime - mThis.prevCheckTime)/1000.0;
          var metersTraveled = mThis.PtDistance(mThis.prevLat, mThis.prevLon, avgLat, avgLon)*1000.0;
          
          
          var metersPerSecond = metersTraveled/secondsElapsed;
          
          if (metersPerSecond < 0.5)
          {
            metersTraveled = 0.0;
            metersPerSecond = 0.0;
          }
          
          metersTraveled = Math.min(metersTraveled, mThis.maxSpeed*secondsElapsed);
          
          
          if (mThis.getSpeed)
          {
            mThis.getSpeed(metersPerSecond, metersTraveled);
          }
          
          
          mThis.metersTraveled += metersTraveled;
          
          mThis.prevLat = avgLat;
          mThis.prevLon = avgLon;
          mThis.curPositionCheck = 0;
          
          mThis.prevCheckTime = Date.now();
      }
      if (mThis.getGPSCoords)
      {
        mThis.getGPSCoords(avgLat, avgLon);
      }
    }
  };


  this.ExpDistr = function(avgAmount, maxAmount, v)
  {
    return Math.min(maxAmount, Math.round(-Math.log(v)*avgAmount));
  };

  // Works for negative values
  this.GoodMod = function(a, b)
  {
    return (b + (a%b)) % b;
  };


  this.ClampLatLon = function(lat, lon)
  {
    var didChange = true;
    while (didChange)
    {
      didChange = false;
      while (lat > 360)
      {
        lat -= 360;
        didChange = true;
      }
      while (lat < -360)
      {
        lat += 360;
        didChange = true;
      }
      while (lon > 360)
      {
        lon -= 360;
        didChange = true;
      }
      while (lon < -360)
      {
        lon += 360;
        didChange = true;
      }
      while (lat > 90)
      {
        lat = 180-lat;
        didChange = true;
      }
      while (lat < -90)
      {
        lat = -(180+lat);
        didChange = true;
      }
      while (lon > 180)
      {
        lon -= 360;
        didChange = true;
      }
      while (lon < -180)
      {
        lon += 360;
        didChange = true;
      }
    }
    return [lat, lon]
  };

  this.GeneratePoints = function(lat, lon, seed){
    var scaleFactor = 10000.0;
    var latMod = 5001;
    var lonMod = 5503;
      
    var latlon = mThis.ClampLatLon(lat, lon);
    lat = latlon[0];
    lon = latlon[1];
    
    // lat is from -90 to 90
    lat = lat + 90.0;
    // lon is from -180 to 180
    lon = lon + 180.0;
    
    // split into about 15m wide cells
    var latCellOriginal = Math.round(lat*scaleFactor);
    var lonCellOriginal = Math.round(lon*scaleFactor);
    
    var cellActualLat = latCellOriginal/scaleFactor;
    var cellActualLon = lonCellOriginal/scaleFactor;
    
    
    var latCell = mThis.GoodMod(latCellOriginal,latMod);
    var lonCell = mThis.GoodMod(lonCellOriginal,lonMod);
    var points = [];
    var lookRange = 11; // this needs to be odd
    var viewRange = 6.0
    for (var x = 0; x < lookRange; x++)
    {
      var xOffset = x-Math.floor(lookRange/2);
      var curX = mThis.GoodMod(latCell+xOffset, latMod);
      for (var y = 0; y < lookRange; y++)
      {
        var yOffset = y-Math.floor(lookRange/2);
        var curY = mThis.GoodMod(lonCell+yOffset, lonMod);
        
    
        var arng = getxor4069(Math.round(((curX+1)*latMod+(curY+1)*latMod*lonMod)*7477)+seed*983);
        
        var ptCountNoise = arng();
        
        
        var ptCount = mThis.ExpDistr(3, 18, ptCountNoise);
        
        
        var curCellActualLat = cellActualLat;
        var curCellActualLon = cellActualLon;
        
        for (var i = 0; i < ptCount; i++)
        {
          var arngPt = getxor4069(Math.round(arng()*8353));
          var ptX = arngPt()+xOffset;
          var ptY = arngPt()+yOffset;
          if(Math.sqrt(ptX*ptX+ptY*ptY) < viewRange)
          {
            var actualPtX = (latCellOriginal+ptX)/scaleFactor-90.0;
            var actualPtY = (lonCellOriginal+ptY)/scaleFactor-180.0;
            latlon = mThis.ClampLatLon(actualPtX, actualPtY);
            points.push([ptX, ptY, latlon[0], latlon[1], arngPt]);
          }
        }
      }
    }
    return points;
  };
  
  window.addEventListener('ontouchstart', this.ParseTouchDown);
  window.addEventListener('touchstart', this.ParseTouchDown);
  window.addEventListener('mousedown', this.ParseTouchDown);
  window.addEventListener('onmousedown', this.ParseTouchDown);

  window.addEventListener('ontouchend', this.ParseTouchUp);
  window.addEventListener('touchend', this.ParseTouchUp);
  window.addEventListener('mouseup', this.ParseTouchUp);
  window.addEventListener('onmouseup', this.ParseTouchUp);
  
  this.CallGPSTracker(isHighAccuracy);
}



// A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
//
// This fast non-cryptographic random number generator is designed for
// use in Monte-Carlo algorithms. It combines a long-period xorshift
// generator with a Weyl generator, and it passes all common batteries
// of stasticial tests for randomness while consuming only a few nanoseconds
// for each prng generated.  For background on the generator, see Brent's
// paper: "Some long-period random number generators using shifts and xors."
// http://arxiv.org/pdf/1104.3115.pdf
//
// Usage:
//
// var xor4096 = require('xor4096');
// random = xor4096(1);                        // Seed with int32 or string.
// assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
// assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
//
// For nonzero numeric keys, this impelementation provides a sequence
// identical to that by Brent's xorgens 3 implementaion in C.  This
// implementation also provides for initalizing the generator with
// string seeds, or for saving and restoring the state of the generator.
//
// On Chrome, this prng benchmarks about 4.5 times slower than
// Javascript's built-in Math.random().


function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    var w = me.w,
        X = me.X, i = me.i, t, v;
    // Update Weyl generator.
    me.w = w = (w + 0x61c88647) | 0;
    // Update xor generator.
    v = X[(i + 34) & 127];
    t = X[i = ((i + 1) & 127)];
    v ^= v << 13;
    t ^= t << 17;
    v ^= v >>> 15;
    t ^= t >>> 12;
    // Update Xor generator array state.
    v = X[i] = v ^ t;
    me.i = i;
    // Result is the combination.
    return (v + (w ^ (w >>> 16))) | 0;
  };

  function init(me, seed) {
    var t, v, i, j, w, X = [], limit = 128;
    if (seed === (seed | 0)) {
      // Numeric seeds initialize v, which is used to generates X.
      v = seed;
      seed = null;
    } else {
      // String seeds are mixed into v and X one character at a time.
      seed = seed + '\0';
      v = 0;
      limit = Math.max(limit, seed.length);
    }
    // Initialize circular array and weyl value.
    for (i = 0, j = -32; j < limit; ++j) {
      // Put the unicode characters into the array, and shuffle them.
      if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
      // After 32 shuffles, take v as the starting w value.
      if (j === 0) w = v;
      v ^= v << 10;
      v ^= v >>> 15;
      v ^= v << 4;
      v ^= v >>> 13;
      if (j >= 0) {
        w = (w + 0x61c88647) | 0;     // Weyl.
        t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
        i = (0 == t) ? i + 1 : 0;     // Count zeroes.
      }
    }
    // We have detected all zeroes; make the key nonzero.
    if (i >= 128) {
      X[(seed && seed.length || 0) & 127] = -1;
    }
    // Run the generator 512 times to further mix the state before using it.
    // Factoring this as a function slows the main generator, so it is just
    // unrolled here.  The weyl generator is not advanced while warming up.
    i = 127;
    for (j = 4 * 128; j > 0; --j) {
      v = X[(i + 34) & 127];
      t = X[i = ((i + 1) & 127)];
      v ^= v << 13;
      t ^= t << 17;
      v ^= v >>> 15;
      t ^= t >>> 12;
      X[i] = v ^ t;
    }
    // Storing state as object members is faster than using closure variables.
    me.w = w;
    me.X = X;
    me.i = i;
  }

  init(me, seed);
}

function getxor4069(seed) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      prng = function() { return (xg.next() >>> 0) / ((1 << 30) * 4); };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / ((1 << 30) * 4),
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  return prng;
}
