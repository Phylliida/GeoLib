# GeoLib
A simple javascript library for making games like pokemon go

Example Usage:


```html
<html>
<head>
<script src="js/geolib.min.js"></script>
<script>

var isHighAccuracy = true;
var gpsPingRate = 500;
var geo;

// updates every gpsPingRate milliseconds (in this case 500 milliseconds so 0.5 seconds)
function GetPosition(lat, lon)
{
  console.log("latitude: " + lat + " longitude: " + lon);
  
  // This lets you call the point generator which will return the points that are near you.
  // Each point has its own seeded random number generator (xorshift) that returns a random float between 0 and 1 (inclusive)
  // As long as you use the same seed as someone else then you will see all of the same points as they do if you
  // walk where they were or are next to them. This doesn't require any data
  var seed = 27;
  var points = geo.GeneratePoints(lat, lon, 27);
  
  // We are going to display things we see in a canvas
  var windowSizeInPixels = 500;
  
  
  var c = document.getElementById("myCanvas");
  var ctx = c.getContext("2d");
  c.width = windowSizeInPixels;
  c.height = windowSizeInPixels;
  
  
  
  // This can convert meters to lat/lon degrees
  // Points will be generated around with at most about 18 meters away from you
  var viewRange = geo.MetersToDegrees(20.0);
  
  for (var i = 0; i < points.length; i++)
  {
    var pt = points[i];
    // Local coordinates if you want them they probably aren't useful for you
    var ptX = pt[0];
    var ptY = pt[1];
    // Lat and lon of the generated point
    var ptLat = pt[2];
    var ptLon = pt[3];
    // pseudo random number generator for that point (will always return the same values each time you call GeneratePoints and get this as a result)
    var prng = pt[4];
    
    // Take the lattitude of this point subtract our latitude to make it relative to us,
    // add viewRange/2 to center us in the middle of the screen, divide by view range to make it a value between 0 and 1,
    // then multiply by windowSizeInPixels to get a point on the screen
    var ptScreenX = (ptLat-lat+viewRange/2)/viewRange*windowSizeInPixels;
    var ptScreenY = (ptLon-lon+viewRange/2)/viewRange*windowSizeInPixels;
    
    // this library generates a lot of points for flexibility as needed but you'll probably want to only show the user a few of them
    // For example we can show 1/100 of them
    if (prng() < 0.1)
    {
      // Draw our generated points as a black dot with a radius of 10 pixels
      ctx.beginPath();
      ctx.fillStyle = 'black';  
      ctx.arc(ptScreenX-5,ptScreenY-5,10,0,2*Math.PI);
      ctx.fill();
    }
  }
  
  // Draw us in the center of the screen as a blue dot with a radius of 20 pixels
  ctx.beginPath();
  ctx.fillStyle = 'blue';
  ctx.arc(windowSizeInPixels/2-10,windowSizeInPixels/2-10,20,0,2*Math.PI);
  ctx.fill();
}

// Updates every 7 seconds or so to smooth over gps drift/twitches
function GetSpeed(metersPerSecond, metersDiff)
{
  console.log("speed in meters per second: " + metersPerSecond);
  console.log("meters traveled since the previous time this function was called: " + metersDiff);
}

geo = new Geo(true, 500, GetPosition,GetSpeed);
</script>
  
<body>
<canvas id="myCanvas"></canvas>
</body>
</html>
```
