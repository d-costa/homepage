API_KEY = '4307ff28b2e2340e29771360e77e9a3b'
DEFAULT_CITY = 'Cascais'

var city = DEFAULT_CITY;

function buildLink(apiKey, city) {
	return 'https://api.openweathermap.org/data/2.5/weather?q='+
		city + '&units=metric&appid=' + apiKey;
}

function buildDate() {
	var d = new Date();
	var month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", 
		"Sep", "Oct", "Nov", "Dec", ];
	return d.getDate() + ' ' + month_names[d.getMonth()];
}

function getWeatherIconClass(openWeatherIconID) {
	var mapping = {
		"01d": " wi-day-sunny",
		"01n": " wi-night-clear",
		"02d": " wi-day-cloudy",
		"02n": " wi-night-alt-cloudy",
		"03d": " wi-cloud",
		"03n": " wi-cloud",
		"04d": " wi-cloudy",  
		"04n": " wi-cloudy",
		"09d": " wi-rain",
		"09n": " wi-rain",
		"10d": " wi-day-rain-mix",
		"10n": " wi-night-rain-mix",
		"11d": " wi-thunderstorm",
		"11n": " wi-thunderstorm",
		"13d": " wi-day-snow",
		"13n": " wi-night-snow",
		"50d": " wi-day-fog",
		"50n": " wi-night-fog",
	};
	return mapping[openWeatherIconID];
}

document.getElementById("date").innerText = buildDate();

// Set temperature and image
var request = new XMLHttpRequest();
request.open("GET", buildLink(API_KEY, "Cascais,PT"), true);
request.onload = function(){
	var obj = JSON.parse(this.response);
	if (request.status >= 200 && request.status < 400) {
		var temp = Math.round(obj.main.temp);
		var iconID = obj.weather[0].icon;
		var description = obj.weather[0].description;
		document.getElementById('temperature').innerText = temp + '\u00B0';
		document.getElementById('weatherIcon').className += getWeatherIconClass(iconID);
		document.getElementById('weatherIcon').title = description;
	}
	else{
		console.log("The city doesn't exist! Kindly check");
	}
}
request.send();
