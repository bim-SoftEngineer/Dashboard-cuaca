// --- GANTI DENGAN API KEY ANDA ---
const apikey = "dabb2f1a4ca7790a248545153619526f";

// Ambil elemen DOM
const searchView = document.getElementById("search-view");
const resultsView = document.getElementById("results-view");
const backBtn = document.getElementById("back-btn");
const form = document.getElementById("form");
const search = document.getElementById("search");
const currentWeatherContainer = document.getElementById("current-weather-container");
const forecastContainer = document.getElementById("forecast-container");

// Variabel global
let currentUnit = 'C';
let currentTempKelvin;
let dailyForecastsData = [];
let map;
let marker;

// --- FUNGSI UNTUK MENGGANTI TAMPILAN ---
function showResultsView() {
    searchView.classList.remove('active');
    resultsView.classList.add('active');
}

function showSearchView() {
    resultsView.classList.remove('active');
    searchView.classList.add('active');
    setTimeout(() => map.invalidateSize(), 10);
}

// --- INISIALISASI PETA LEAFLET ---
function initializeMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.on('click', (e) => searchByCoords(e.latlng.lat, e.latlng.lng));
}

// --- EVENT LISTENERS ---
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = search.value;
    if (city) searchByCity(city);
});

backBtn.addEventListener('click', showSearchView);


// --- FUNGSI PENCARIAN & FETCH DATA ---
function searchByCity(city) {
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apikey}`;
    const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apikey}`;
    fetchAndDisplay(weatherURL, forecastURL);
}

function searchByCoords(lat, lon) {
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apikey}`;
    const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apikey}`;
    fetchAndDisplay(weatherURL, forecastURL);
}

async function fetchAndDisplay(weatherURL, forecastURL) {
    currentWeatherContainer.innerHTML = `<h3>Memuat data...</h3>`;
    forecastContainer.innerHTML = "";
    showResultsView();

    try {
        const [weatherResp, forecastResp] = await Promise.all([fetch(weatherURL), fetch(forecastURL)]);
        if (!weatherResp.ok || !forecastResp.ok) throw new Error('Data tidak ditemukan');
        
        const weatherData = await weatherResp.json();
        const forecastData = await forecastResp.json();
        
        // Simpan suhu dalam Celsius, karena kita pakai &units=metric
        currentTempKelvin = weatherData.main.temp; 
        
        displayCurrentWeather(weatherData);
        processAndDisplayForecast(forecastData);
        updateMap(weatherData.coord.lat, weatherData.coord.lon);

    } catch (error) {
        currentWeatherContainer.innerHTML = `<h3>Lokasi tidak ditemukan.</h3>`;
        // Opsional: kembali ke halaman pencarian jika error
        setTimeout(showSearchView, 2000);
    }
}

// --- FUNGSI UNTUK MENAMPILKAN DATA & FUNGSI BANTUAN ---

// PERBAIKAN 1: Menyesuaikan HTML dengan tombol toggle baru
function displayCurrentWeather(data) {
    const temp = Math.round(data.main.temp);
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;

    const weatherCardHTML = `
        <div class="weather-card">
            <h2 class="city-name">${data.name}, ${data.sys.country}</h2>
            <p class="date">${getFormattedDate(new Date())}</p>
            <img class="weather-icon" src="https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png" />
            <h1 class="temperature">${temp}°</h1>
            <p class="description">${data.weather[0].description}</p>
            <div class="details">
                <div class="detail-item"><i class="fa-solid fa-droplet"></i><div><span class="value humidity">${humidity}%</span><p>Kelembapan</p></div></div>
                <div class="detail-item"><i class="fa-solid fa-wind"></i><div><span class="value wind-speed">${windSpeed} m/s</span><p>Kecepatan Angin</p></div></div>
            </div>
            <div class="temp-toggle-container">
                <span>°C</span>
                <button id="toggle-unit"></button>
                <span>°F</span>
            </div>
        </div>
    `;
    currentWeatherContainer.innerHTML = weatherCardHTML;
    // Panggil update display untuk memastikan tombolnya di posisi yang benar
    updateTemperatureDisplay(); 
    document.getElementById('toggle-unit').addEventListener('click', toggleTemperatureUnit);
}

function processAndDisplayForecast(forecastData) {
    dailyForecastsData = forecastData.list.filter(item => item.dt_txt.includes("12:00:00"));
    let forecastHTML = `<div class="forecast-container">`;
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    dailyForecastsData.forEach((forecast, index) => {
        const date = new Date(forecast.dt * 1000);
        forecastHTML += `
            <div class="forecast-card" data-index="${index}">
                <p class="day">${days[date.getDay()]}</p>
                <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="icon">
                <p class="temp">${Math.round(forecast.main.temp)}°</p>
            </div>
        `;
    });
    forecastHTML += `</div>`;
    forecastContainer.innerHTML = forecastHTML;
    
    document.querySelectorAll('.forecast-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            updateMainDisplay(index);
        });
    });
}

function updateMainDisplay(index) {
    const forecast = dailyForecastsData[index];
    
    document.querySelector('.date').textContent = getFormattedDate(new Date(forecast.dt * 1000));
    document.querySelector('.weather-icon').src = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}@4x.png`;
    document.querySelector('.description').textContent = forecast.weather[0].description;
    document.querySelector('.humidity').textContent = `${forecast.main.humidity}%`;
    document.querySelector('.wind-speed').textContent = `${forecast.wind.speed} m/s`;
    
    currentTempKelvin = forecast.main.temp;
    updateTemperatureDisplay();
    
    document.querySelectorAll('.forecast-card').forEach(card => card.classList.remove('active'));
    document.querySelector(`.forecast-card[data-index="${index}"]`).classList.add('active');
}

function updateMap(lat, lon) {
    if (marker) map.removeLayer(marker);
    map.setView([lat, lon], 10);
    marker = L.marker([lat, lon]).addTo(map);
}

// PERBAIKAN 2: Fungsi konversi tidak lagi diperlukan jika API memberi Celsius
function CtoF(C) { return Math.round((C * 9/5) + 32); }

function toggleTemperatureUnit() {
    currentUnit = (currentUnit === 'C') ? 'F' : 'C';
    updateTemperatureDisplay();
}

// PERBAIKAN 3: Logika update tombol toggle baru
function updateTemperatureDisplay() {
    const temperatureElement = document.querySelector('.temperature');
    const toggleButton = document.getElementById('toggle-unit');

    if (currentUnit === 'C') {
        // Suhu sudah dalam Celsius dari API
        temperatureElement.innerHTML = `${Math.round(currentTempKelvin)}°`;
        toggleButton.classList.remove('active');
    } else {
        // Konversi Celsius ke Fahrenheit
        temperatureElement.innerHTML = `${CtoF(currentTempKelvin)}°`;
        toggleButton.classList.add('active');
    }
}

function getFormattedDate(date) {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Panggil inisialisasi peta saat halaman dimuat
initializeMap();