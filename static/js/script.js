var latitude;
var longitude;
var PlacesSearch;
var radius;
var past_searches = {};
var loc;
var colors = { RED: 0,
               GREEN: 1,
               BLUE: 2,
               YELLOW: 3,
               PURPLE: 4
              };
var places = {};
var num_waiting;
var ride;
var fav = [];

function getLocation() {
    if (navigator.geolocation) {
      console.log(document.getElementById('location').value);
      console.log(document.getElementById('ride').value);
      ride = document.getElementById('ride').value == "yes"? "yes": "no" ;
      radius = ride === "yes" ? 2000: 300;
        l = document.getElementById('location').value;
        loc = [l];
        navigator.geolocation.getCurrentPosition(showPosition);
    } else { 
        x.innerHTML = "Geolocation is not supported by this browser.";
    }
}

function showPosition(position) {
    var legend = document.getElementById('legend');
    legend.innerHTML = "<img src='http://maps.google.com/mapfiles/ms/icons/green-dot.png'/> Current Location <img src='http://maps.google.com/mapfiles/ms/icons/red-dot.png'/> Open <img src='http://maps.google.com/mapfiles/ms/icons/blue-dot.png'/> Close <img src='http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'/> Unknown"   

    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    xhr('POST', '/update_session', JSON.stringify({lat: latitude, lon: longitude, radius: radius, ride: ride}))
    .success(function(res){
      console.log(res)
    });
    initialize();
}

var map;
var infowindow;

function initialize() {
  var current_location = new google.maps.LatLng(latitude, longitude);

  map = new google.maps.Map(document.getElementById('map-canvas'), {
    center: current_location,
    zoom: 15
  });

  var curr_pos = new google.maps.LatLng(latitude, longitude);

  var marker = new google.maps.Marker({
      position: curr_pos,
      map: map,
      title: 'Current Location'
  });

  marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png')

  var request = {
    location: current_location,
    radius: radius,
    types: loc
  };
  infowindow = new google.maps.InfoWindow();
  var service = new google.maps.places.PlacesService(map);
  service.nearbySearch(request, callback);
}

function callback(results, status) {
  num_waiting = results.length;
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    for (var i = 0; i < results.length; i++) {
      places[results[i].name] = {};

      url = "https://maps.googleapis.com/maps/api/place/details/json?placeid=" + results[i].place_id + "&key=AIzaSyDUTTy9YMrZYTrGhmvtQe7ATLSCzqPqdkg"; //AIzaSyDUTTy9YMrZYTrGhmvtQe7ATLSCzqPqdkg //AIzaSyAJkwpfrUeRquH9a5O5J_6noF8Rf0SwM1M
      xhr('GET', url).success(function(data) {
        num_waiting--;
        
        var detail = data.result;
        places[detail.name] = detail;
        
        var curr_pl = places[detail.name];
        if(curr_pl.hasOwnProperty("opening_hours")) {
          if(curr_pl.opening_hours.open_now) createMarker(curr_pl, colors.RED);
          else createMarker(curr_pl, colors.BLUE);
        }
        else {
          createMarker(curr_pl, colors.YELLOW);
        }

        if(num_waiting == 0) {
          renderList();
        }
      });
    }
  }
}

function pickIcon(color) {
  switch(color) {
    case colors.RED:
      return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    case colors.GREEN:
      return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    case colors.BLUE:
      return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    case colors.YELLOW:
      return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    case colors.PURPLE:
      return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
  }
}

function createMarker(place, color) {
  var icon = pickIcon(color);
  var placeLoc = place.geometry.location;
  var marker = new google.maps.Marker({
    map: map,
    position: place.geometry.location,
    icon: icon
  });

  google.maps.event.addListener(marker, 'click', function() {
    var rating = typeof place.rating == "undefined" ? "-": place.rating;
    var link = "http://maps.google.com/?saddr=" + latitude + "," + longitude + "&daddr=" + place.formatted_address;
    var content = "<strong>" + place.name + "</strong><br>" + place.vicinity + "<br>" + rating + "<br><a href='" + link + "' target='_blank'>direction</a><br><a href=" + place.url + " target='_blank'>more info</a>";
    
    infowindow.setContent(content);
    infowindow.open(map, this);

  });
}

function renderList() {
  var list = document.getElementById("list");

  clearContent(list);
  
  list.innerHTML = "<br><br><p class='instruction'>Results</p>";
  var i = 0;
  var param = "hi";
  for(var pl in places){
    var rating = typeof places[pl].rating == "undefined" ? "-": places[pl].rating;
    var link = "http://maps.google.com/?saddr=" + latitude + "," + longitude + "&daddr=" + places[pl].formatted_address;
    list.innerHTML += "<div class='panel panel-default'><div class='panel-heading'><h4>" + pl + "</h4>" + "</div><div class='panel-body'>" + places[pl].formatted_address + "<br>" + rating + "<br><a href='" + link + "' target='_blank'><span class='glyphicon glyphicon-globe'></span> direction</a>" + "<br><a href=" + places[pl].url + " target='_blank'><span class='glyphicon glyphicon-info-sign'></span> more info</a><br><a onClick='donothing(&#39;" + places[pl].name + "&#39;)' /><span class='glyphicon glyphicon-heart'></span> add to favorite</a></div></div>";
    i++;
  }
}

function clearContent(item) {
  while(item.firstChild) {
    item.removeChild(item.firstChild);
  }
}

function donothing(place_name) {
  var place = places[place_name];
  console.log(place);
  var body = {name: place.name, address: place.formatted_address, rating: place.rating, url: place.url};
  console.log(body);
  xhr('POST', '/add_fav', JSON.stringify(body))
  .success(function(res) {
    alert("favorite added");
    console.log("success");
    fav = res;
    renderFavs();
  });
}

function renderFavs() {
  var fav_tag = document.getElementById('favorites');
  fav_tag.innerHTML = "<br><br><p class='instruction'>Favorites</p>"
  for(var i in fav) {
    var rating = typeof fav[i].rating == "undefined" ? "-": fav[i].rating;
    var link = "http://maps.google.com/?saddr=" + latitude + "," + longitude + "&daddr=" + fav[i].address;
    fav_tag.innerHTML += "<div class='panel panel-default'><div class='panel-heading'><h4>" + fav[i].name + "</h4>" + "</div><div class='panel-body'>" + fav[i].address + "<br>" + fav[i].rating + "<br><a href='" + link + "' target='_blank'><span class='glyphicon glyphicon-globe'></span> direction</a>" + "<br><a href=" + fav[i].url + " target='_blank'><span class='glyphicon glyphicon-info-sign'></span> more info</a></div></div>";
  }
}
